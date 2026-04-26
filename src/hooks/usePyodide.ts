'use client';

/**
 * usePyodide.ts  –  src/hooks/usePyodide.ts
 *
 * Manages the Pyodide WebWorker lifecycle and exposes two public execution
 * functions to React components:
 *
 *   runCode(code)                        – plain execution (Run button)
 *   submitAndGrade(userCode, valCode)    – graded execution (Submit button)
 *
 * Grading works by concatenating the user's raw code with the validation code
 * and letting Python surface errors naturally. The JS layer then parses the
 * Pyodide traceback with regexes:
 *
 *   AssertionError anywhere in traceback → grading_error  (assertion hint shown)
 *   Any other exception                  → runtime_error  (bottom exception line)
 *   Worker 'result' (no throw)           → passed
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types (exported so Workspace.tsx can import them)
// ─────────────────────────────────────────────────────────────────────────────

export interface PyodideOutput {
  stdout: string;
  images: string[]; // base64 PNG strings, one per plt.show() call
}

export type GradeStatus = 'passed' | 'grading_error' | 'runtime_error';

export interface GradeResult {
  status: GradeStatus;
  /** Human-readable message to display in the UI */
  message: string;
  /** stdout captured during the graded run (shown in Console) */
  stdout: string;
  /** Any images captured during the graded run */
  images: string[];
}

export interface UsePyodideReturn {
  runCode: (code: string) => void;
  submitAndGrade: (userCode: string, validationCode: string) => Promise<GradeResult>;
  isLoading: boolean;
  isReady: boolean;
  isExecuting: boolean;
  isGrading: boolean;
  output: PyodideOutput | null;
  /** Plain string so React renders it directly – no `.message` property access needed */
  runError: string | null;
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker message protocol (mirrors pyodide.worker.js)
// ─────────────────────────────────────────────────────────────────────────────

type WorkerIncoming =
  | { id: string; type: 'init' }
  | { id: string; type: 'run'; code: string };

type WorkerOutgoing =
  | { id: string; type: 'ready' }
  | { id: string; type: 'result'; stdout: string; images: string[] }
  | { id: string; type: 'error'; message: string; traceback?: string | undefined; stdout?: string; images?: string[] };

// ─────────────────────────────────────────────────────────────────────────────
// Known Python exception names – used to find the bottommost error line
// AssertionError is intentionally excluded here; it is handled separately in
// parseGradingError so it always routes to grading_error, never runtime_error.
// ─────────────────────────────────────────────────────────────────────────────

const PYTHON_EXCEPTION_NAMES = [
  'SyntaxError',
  'IndentationError',
  'TabError',
  'NameError',
  'TypeError',
  'ValueError',
  'AttributeError',
  'ImportError',
  'ModuleNotFoundError',
  'KeyError',
  'IndexError',
  'ZeroDivisionError',
  'FileNotFoundError',
  'OSError',
  'RuntimeError',
  'StopIteration',
  'OverflowError',
  'MemoryError',
  'RecursionError',
  'NotImplementedError',
  'Exception',
];

// ─────────────────────────────────────────────────────────────────────────────
// buildGradingScript
//
// Concatenates the student's raw code with the validation code verbatim —
// no try/except wrappers, no JS-side indentation. Python receives the code
// exactly as the student wrote it so all whitespace and syntax is preserved.
//
// plt.show() is mocked to a no-op so figures remain open for plt.gca()
// inspection by the validation assertions. The worker's _show_override has
// already captured rendered figures before this script runs.
// ─────────────────────────────────────────────────────────────────────────────

function buildGradingScript(userCode: string, validationCode: string): string {
  return [
    'import matplotlib.pyplot as _plt_grading',
    '_real_show = _plt_grading.show',
    '_plt_grading.show = lambda *a, **kw: None',
    '',
    userCode,        // verbatim – indentation fully preserved
    '',
    validationCode,  // hidden assertions
    '',
    '_plt_grading.show = _real_show',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// extractBottomExceptionLine
//
// Walks the combined traceback string from the bottom up and returns the first
// line that matches a known Python exception name. Falls back to the last
// non-empty line if nothing matches.
// ─────────────────────────────────────────────────────────────────────────────

function extractBottomExceptionLine(full: string): string {
  const exceptionPattern = new RegExp(`(${PYTHON_EXCEPTION_NAMES.join('|')})[^\n]*`);
  const lines = full.split('\n').reverse();
  for (const line of lines) {
    if (exceptionPattern.test(line)) return line.trim();
  }
  return lines.find((l) => l.trim() !== '')?.trim() ?? full.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// parseGradingError
//
// Pyodide surfaces Python exceptions as { message, traceback }. Both fields
// may contain the full multi-line traceback, or one may have only the final
// exception line. We normalise both into one searchable string.
//
// Detection strategy:
//
//   1. If "AssertionError" appears ANYWHERE in the combined string, it is a
//      validation failure (grading_error). The colon is optional (:?) because
//      a bare `assert` with no message string produces "AssertionError" with
//      no colon. We also fall back to the raw `message` field as the hint
//      source, because Pyodide sometimes places the hint text there without
//      an "AssertionError:" prefix.
//
//   2. Everything else is a runtime crash. We extract the bottommost exception
//      line (SyntaxError, NameError, etc.) from the traceback.
//
// NOTE: AssertionError is deliberately absent from PYTHON_EXCEPTION_NAMES so
// it cannot accidentally fall through and be labelled a runtime_error.
// ─────────────────────────────────────────────────────────────────────────────

function parseGradingError(
  message: string,
  traceback: string | undefined,
  stdout: string,
  images: string[],
): GradeResult {
  // Coerce undefined → '' so template literals never produce the string "undefined"
  const tb = traceback ?? '';
  const full = `${tb}\n${message}`;

  // ── 1. AssertionError → grading feedback ─────────────────────────────────
  if (full.includes('AssertionError')) {
    const assertMatch = full.match(/AssertionError:?\s*([^\n]*)/);
    const hint =
      (assertMatch && assertMatch[1].trim()) ||
      message.trim() ||
      'Your answer is not quite right. Check the task description and try again.';
    return { status: 'grading_error', message: hint, stdout, images };
  }

  // ── 2. Any other exception → runtime error ────────────────────────────────
  const errorLine = extractBottomExceptionLine(full);
  return {
    status: 'runtime_error',
    message: errorLine || 'Your code raised an error. Check the Console for details.',
    stdout,
    images,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// extractRunError
//
// For plain (non-graded) runs: extract a clean single-line error rather than
// dumping the full Pyodide traceback blob into the Console.
// ─────────────────────────────────────────────────────────────────────────────

function extractRunError(message: string, traceback: string | undefined): string {
  const full = `${traceback ?? ''}\n${message}`;
  return extractBottomExceptionLine(full) || message || 'An error occurred.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePyodide(): UsePyodideReturn {
  const workerRef  = useRef<Worker | null>(null);
  const pendingRef = useRef<
    Map<string, { resolve: (v: WorkerOutgoing) => void; reject: (e: unknown) => void }>
  >(new Map());

  const [isLoading,   setIsLoading]   = useState(true);
  const [isReady,     setIsReady]     = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isGrading,   setIsGrading]   = useState(false);
  const [output,      setOutput]      = useState<PyodideOutput | null>(null);
  const [runError,    setRunError]    = useState<string | null>(null);

  // ── Boot worker ────────────────────────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker('/pyodide.worker.js');
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerOutgoing>) => {
      const msg = event.data;
      const pending = pendingRef.current.get(msg.id);
      if (pending) {
        pending.resolve(msg);
        pendingRef.current.delete(msg.id);
      }
      if (msg.type === 'ready') {
        setIsLoading(false);
        setIsReady(true);
      }
    };

    worker.onerror = (err) => {
      setRunError(err.message ?? 'Worker crashed unexpectedly.');
      setIsLoading(false);
      setIsExecuting(false);
      setIsGrading(false);
    };

    // Warm up in the background
    const id = crypto.randomUUID();
    pendingRef.current.set(id, { resolve: () => {}, reject: () => {} });
    worker.postMessage({ id, type: 'init' } as WorkerIncoming);

    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  // ── Low-level send ─────────────────────────────────────────────────────────
  const postToWorker = useCallback((msg: WorkerIncoming): Promise<WorkerOutgoing> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) { reject(new Error('Worker not initialised')); return; }
      pendingRef.current.set(msg.id, { resolve, reject });
      workerRef.current.postMessage(msg);
    });
  }, []);

  // ── runCode (Run button) ───────────────────────────────────────────────────
  const runCode = useCallback(async (code: string) => {
    if (!workerRef.current) return;
    setIsExecuting(true);
    setRunError(null);
    setOutput(null);

    try {
      const res = await postToWorker({ id: crypto.randomUUID(), type: 'run', code });
      if (res.type === 'result') {
        setOutput({ stdout: res.stdout, images: res.images });
      } else if (res.type === 'error') {
        setOutput({ stdout: res.stdout || '', images: res.images || [] });
        setRunError(extractRunError(res.message, res.traceback));
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
    }
  }, [postToWorker]);

  // ── submitAndGrade (Submit button) ────────────────────────────────────────
  const submitAndGrade = useCallback(
    async (userCode: string, validationCode: string): Promise<GradeResult> => {
      if (!workerRef.current) {
        return { status: 'runtime_error', message: 'Python runtime is not ready yet.', stdout: '', images: [] };
      }

      setIsGrading(true);
      setIsExecuting(true);
      setRunError(null);
      setOutput(null);

      const script = buildGradingScript(userCode, validationCode);

      try {
        const res = await postToWorker({ id: crypto.randomUUID(), type: 'run', code: script });

        if (res.type === 'result') {
          setOutput({ stdout: res.stdout, images: res.images });
          return { status: 'passed', message: 'All checks passed!', stdout: res.stdout, images: res.images };
        }

        if (res.type === 'error') {
          const grade = parseGradingError(res.message, res.traceback, res.stdout || '', res.images || []);
          // Only surface runtime errors in the Console red banner;
          // grading errors get their own orange banner via gradingFeedback state.
          if (grade.status === 'runtime_error') {
            setRunError(grade.message);
          }
          return grade;
        }

        return { status: 'runtime_error', message: 'Unexpected response from the runtime.', stdout: '', images: [] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setRunError(msg);
        return { status: 'runtime_error', message: msg, stdout: '', images: [] };
      } finally {
        setIsGrading(false);
        setIsExecuting(false);
      }
    },
    [postToWorker],
  );

  // ── reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => { setOutput(null); setRunError(null); }, []);

  return { runCode, submitAndGrade, isLoading, isReady, isExecuting, isGrading, output, runError, reset };
}