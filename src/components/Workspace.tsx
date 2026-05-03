'use client';

import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import {
  Play,
  CheckCircle2,
  TerminalSquare,
  LineChart,
  Loader2,
  AlertTriangle,
  XCircle,
  PartyPopper,
  Wifi,
  WifiOff,
  GripHorizontal,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  RefreshCcw,
  X,
} from 'lucide-react';
import { type Exercise } from '@/data';
import { usePyodide, type GradeResult } from '@/hooks/usePyodide';

interface WorkspaceProps {
  exercise: Exercise;
  onSuccess: () => void;
  onNext?: () => void;
  hasNext?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small presentational components
// ─────────────────────────────────────────────────────────────────────────────

function RuntimeStatus({
  isLoading, isReady, isExecuting,
}: { isLoading: boolean; isReady: boolean; isExecuting: boolean }) {
  if (isExecuting) return (
    <span className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
      <Loader2 size={12} className="animate-spin" /> executing…
    </span>
  );
  if (isLoading) return (
    <span className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
      <Loader2 size={12} className="animate-spin" /> loading runtime…
    </span>
  );
  if (isReady) return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
      <Wifi size={12} /> runtime ready
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-xs text-red-400 font-mono">
      <WifiOff size={12} /> runtime offline
    </span>
  );
}

// ── Green success banner (shown above the output tabs) ─────────────────────

function SuccessBanner({ onDismiss, onNext, hasNext }: { onDismiss: () => void, onNext?: () => void, hasNext?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-950 border-b border-emerald-700/60 shrink-0 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 text-emerald-300">
        <PartyPopper size={20} className="shrink-0" />
        <div>
          <p className="text-sm font-semibold leading-tight">All checks passed!</p>
          <p className="text-xs text-emerald-400/70 mt-0.5">
            Great work — your solution is correct. {hasNext ? 'Move on to the next exercise.' : 'You have completed all exercises!'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {hasNext && onNext && (
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-sm font-bold rounded-md transition-colors shadow-sm"
          >
            Continue to Next Lesson
            <ChevronRight size={16} />
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-emerald-600 hover:text-emerald-300 transition-colors shrink-0"
        >
          <XCircle size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Orange grading-feedback banner ──────────────────────────────────────────

function GradingFeedbackBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 mb-4 px-4 py-3 rounded-lg border border-amber-600/40 bg-amber-950/50">
      <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-amber-300 mb-1 uppercase tracking-wide">
          Not quite right
        </p>
        <p className="text-sm text-amber-200/90 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

// ── Red runtime-error banner ─────────────────────────────────────────────────

function RuntimeErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 mb-4 px-4 py-3 rounded-lg border border-red-700/40 bg-red-950/40">
      <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-red-300 mb-1 uppercase tracking-wide">
          Runtime error
        </p>
        <p className="text-sm text-red-200/90 font-mono leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
      </div>
    </div>
  );
}

// ── Console pane ─────────────────────────────────────────────────────────────

interface ConsolePaneProps {
  stdout: string | null;
  runError: string | null;
  isExecuting: boolean;
  gradingFeedback: string | null;
}

function ConsolePane({ stdout, runError, isExecuting, gradingFeedback }: ConsolePaneProps) {
  if (isExecuting) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm font-mono">
        <Loader2 size={14} className="animate-spin" /> Running…
      </div>
    );
  }

  const hasContent = runError || gradingFeedback || stdout;

  return (
    <div className="space-y-1">
      {gradingFeedback && <GradingFeedbackBanner message={gradingFeedback} />}
      {runError && !gradingFeedback && <RuntimeErrorBanner message={runError} />}
      {stdout && (
        <div className="font-mono text-sm whitespace-pre-wrap leading-6">
          <span className="text-emerald-400 select-none">$ </span>
          <span className="text-zinc-500 select-none">python main.py{'\n'}</span>
          <span className="text-zinc-200">{stdout}</span>
        </div>
      )}
      {!hasContent && (
        <div className="italic text-zinc-600 text-sm font-mono">
          Click &apos;Run Code&apos; to execute your script…
        </div>
      )}
    </div>
  );
}

// ── Plot pane ─────────────────────────────────────────────────────────────────

const downloadPlot = (b64: string) => {
  const link = document.createElement('a');
  link.href = `data:image/png;base64,${b64}`;
  link.download = "vizmaster_plot.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function PlotPane({ images, isExecuting }: { images: string[]; isExecuting: boolean }) {
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  if (isExecuting) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-text-muted text-sm">
        <Loader2 size={14} className="animate-spin" /> Rendering…
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-panel-border rounded-lg text-text-muted">
        <div className="text-center">
          <LineChart size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Matplotlib figures will appear here.</p>
          <p className="text-xs mt-1 opacity-50">Call plt.show() in your code.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {images.map((b64, i) => (
          <div key={i} className="absolute inset-0 flex items-center justify-center p-4">
            <img
              src={`data:image/png;base64,${b64}`}
              alt={`Matplotlib figure ${i + 1}`}
              onClick={() => { setFullScreenImage(b64); setZoom(1); }}
              className="max-w-full max-h-full w-auto h-auto object-contain bg-white rounded-lg shadow-lg border border-panel-border cursor-pointer hover:opacity-90 transition-opacity"
            />
            <button
              onClick={() => downloadPlot(b64)}
              className="absolute top-6 right-6 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
              title="Download Plot"
            >
              <Download size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Full-Screen Modal */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 bg-black/50 border-b border-zinc-800 shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => z + 0.25)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors" title="Zoom In"><ZoomIn size={18} /></button>
              <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors" title="Zoom Out"><ZoomOut size={18} /></button>
              <button onClick={() => setZoom(1)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors" title="Reset Zoom"><RefreshCcw size={18} /></button>
              <div className="w-px h-6 bg-zinc-700 mx-2" />
              <button onClick={() => downloadPlot(fullScreenImage)} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors font-medium text-sm">
                <Download size={16} /> Download
              </button>
            </div>
            <button onClick={() => setFullScreenImage(null)} className="p-2 text-zinc-400 hover:text-white transition-colors" title="Close"><X size={24} /></button>
          </div>
          <div className="relative flex-1 w-full h-full">
            <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
              <img
                src={`data:image/png;base64,${fullScreenImage}`}
                alt="Full screen plot"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-200 bg-white rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Workspace component
// ─────────────────────────────────────────────────────────────────────────────

export default function Workspace({ exercise, onSuccess, onNext, hasNext }: WorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'plot'>('console');
  const [showSuccess,     setShowSuccess]     = useState(false);
  const [gradingFeedback, setGradingFeedback] = useState<string | null>(null);

  const editorRef = useRef<any>(null);

  const usePyodideHook = usePyodide();
  const {
    runCode: executeCode,
    submitAndGrade,
    isLoading,
    isReady,
    isExecuting,
    isGrading,
    output,
    runError,
  } = usePyodideHook;

  const stdout: string | null = output?.stdout ?? null;
  const images: string[]      = output?.images ?? [];
  const { reset } = usePyodideHook;

  // Reset state when exercise changes
  useEffect(() => {
    setActiveTab('console');
    setShowSuccess(false);
    setGradingFeedback(null);
    reset();

    if (editorRef.current) {
      editorRef.current.setValue(exercise.starting_code);
    }
  }, [exercise, reset]);

  // Auto-switch tabs when a run resolves
  useEffect(() => {
    if (isExecuting) return;
    if (images.length > 0)       setActiveTab('plot');
    else if (stdout || runError)  setActiveTab('console');
  }, [isExecuting, images.length, stdout, runError]);

  const handleRunCodeRef = useRef<() => void>(() => {});

  const handleEditorDidMount = (editor: any, monaco: any) => { 
    editorRef.current = editor; 
    editor.addAction({
      id: 'run-python-code',
      label: 'Run Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => {
        handleRunCodeRef.current();
      }
    });
  };

  // ── Run button ──────────────────────────────────────────────────────────────
  const handleRunCode = () => {
    if (!isReady || isExecuting) return;
    setGradingFeedback(null);
    setShowSuccess(false);
    executeCode(editorRef.current?.getValue() ?? '');
  };

  // Keep ref fresh so Monaco keybinding always uses latest state (isReady/isExecuting)
  useEffect(() => {
    handleRunCodeRef.current = handleRunCode;
  });

  // ── Submit button ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isReady || isExecuting) return;

    setGradingFeedback(null);
    setShowSuccess(false);

    const userCode = editorRef.current?.getValue() ?? '';
    const result: GradeResult = await submitAndGrade(userCode, exercise.validation_code);

    if (result.status === 'passed') {
      setShowSuccess(true);
      onSuccess();
      if (result.images.length > 0) setActiveTab('plot');
      else setActiveTab('console');
      return;
    }

    if (result.status === 'grading_error') {
      setGradingFeedback(result.message);
      setActiveTab('console');
      return;
    }

    // status === 'runtime_error' — runError already set inside hook
    setActiveTab('console');
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Action bar – always visible, sits above the resizable split */}
        <div className="h-14 bg-panel border-b border-panel-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-muted">main.py</span>
            <RuntimeStatus isLoading={isLoading} isReady={isReady} isExecuting={isExecuting} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunCode}
              disabled={!isReady || isExecuting}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#2ea043] hover:bg-[#3fb950] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
            >
              {isExecuting && !isGrading
                ? <Loader2 size={16} className="animate-spin" />
                : <Play size={16} fill="currentColor" />
              }
              {isExecuting && !isGrading ? 'Running…' : 'Run Code'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isReady || isExecuting}
              className="flex items-center gap-2 px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
            >
              {isGrading
                ? <Loader2 size={16} className="animate-spin" />
                : <CheckCircle2 size={16} />
              }
              {isGrading ? 'Grading…' : 'Submit'}
            </button>
          </div>
        </div>

        {/* ── Resizable Editor / Output split ──────────────────────────────── */}
        {/*
          direction="vertical" = panels stacked top-to-bottom
          The drag handle moves up/down (horizontal bar orientation).
        */}
        <Group orientation="vertical" className="flex-1 overflow-hidden">

          {/* TOP: Monaco Editor */}
          <Panel defaultSize={60} minSize={20} className="overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              defaultValue={exercise.starting_code}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
              }}
            />
          </Panel>

          {/* ── Drag handle ────────────────────────────────────────────────── */}
          <Separator className="group relative h-2 bg-[#252526] border-y border-panel-border hover:bg-[#2d2d30] transition-colors cursor-row-resize flex items-center justify-center shrink-0">
            {/* Visible grip indicator */}
            <GripHorizontal
              size={16}
              className="text-zinc-600 group-hover:text-zinc-300 transition-colors pointer-events-none"
            />
          </Separator>

          {/* BOTTOM: Console / Plot output */}
          <Panel defaultSize={40} minSize={15} className="overflow-hidden flex flex-col bg-panel">

            {/* Success banner sits above the tabs so it's always visible */}
            {showSuccess && <SuccessBanner onDismiss={() => setShowSuccess(false)} onNext={onNext} hasNext={hasNext} />}

            {/* Tabs */}
            <div className="flex bg-[#252526] shrink-0 border-b border-panel-border">
              <button
                onClick={() => setActiveTab('console')}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 ${
                  activeTab === 'console'
                    ? 'border-accent text-white bg-panel'
                    : 'border-transparent text-text-muted hover:text-white hover:bg-[#2d2d30]'
                }`}
              >
                <TerminalSquare size={16} />
                Console
                {(runError || gradingFeedback) && !isExecuting && (
                  <span className="absolute top-2.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('plot')}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 ${
                  activeTab === 'plot'
                    ? 'border-accent text-white bg-panel'
                    : 'border-transparent text-text-muted hover:text-white hover:bg-[#2d2d30]'
                }`}
              >
                <LineChart size={16} />
                Plot Output
                {images.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-accent text-white leading-none">
                    {images.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="relative flex-1 w-full h-full">
              {activeTab === 'console' && (
                <div className="absolute inset-0 overflow-auto p-4">
                  <ConsolePane
                    stdout={stdout}
                    runError={runError}
                    isExecuting={isExecuting}
                    gradingFeedback={gradingFeedback}
                  />
                </div>
              )}
              {activeTab === 'plot' && (
                <PlotPane images={images} isExecuting={isExecuting} />
              )}
            </div>
          </Panel>
        </Group>
    </div>
  );
}