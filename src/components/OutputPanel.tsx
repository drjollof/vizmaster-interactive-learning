'use client';

import React from 'react';

interface OutputPanelProps {
  isLoading: boolean;
  isExecuting: boolean;
  output: { stdout: string; images: string[] } | null;
  error: { message: string; traceback: string } | null;
}

export default function OutputPanel({
  isLoading,
  isExecuting,
  output,
  error,
}: OutputPanelProps) {
  // Loading state (Pyodide + packages still downloading)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
        <Spinner />
        <p className="text-sm">Loading Python runtime…</p>
        <p className="text-xs opacity-60">Downloading Pyodide + pandas + matplotlib</p>
      </div>
    );
  }

  // Executing state 
  if (isExecuting) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
        <Spinner />
        <p className="text-sm">Running…</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 h-full overflow-auto">
        <div className="rounded-md border border-red-800 bg-red-950/40 p-4">
          <p className="text-red-400 font-semibold text-sm mb-2">
            ⚠ {error.message}
          </p>
          {error.traceback && error.traceback !== error.message && (
            <pre className="text-red-300/70 text-xs font-mono whitespace-pre-wrap leading-5 mt-2">
              {error.traceback}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // Successful output
  if (output) {
    const hasStdout = output.stdout.trim().length > 0;
    const hasImages = output.images.length > 0;

    return (
      <div className="p-4 h-full overflow-auto space-y-4">
        {/* Text output */}
        {hasStdout && (
          <pre className="text-sm font-mono text-[var(--foreground)] whitespace-pre-wrap leading-6 bg-[var(--panel)] rounded-md p-3 border border-[var(--panel-border)]">
            {output.stdout}
          </pre>
        )}

        {/* Matplotlib images – one <img> per plt.show() call */}
        {hasImages &&
          output.images.map((b64, i) => (
            <div
              key={i}
              className="rounded-md overflow-hidden border border-[var(--panel-border)] bg-white"
            >
              {/* Matplotlib renders on white by default; keep bg white so axes are visible */}
              <img
                src={`data:image/png;base64,${b64}`}
                alt={`matplotlib figure ${i + 1}`}
                className="max-w-full h-auto block"
              />
            </div>
          ))}

        {/* Nothing at all (e.g. code ran but produced no output) */}
        {!hasStdout && !hasImages && (
          <p className="text-[var(--text-muted)] text-sm italic">
            Code executed successfully with no output.
          </p>
        )}
      </div>
    );
  }

  // Idle / empty state
  return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
      Run your code to see output here.
    </div>
  );
}

// Inline spinner so this file is self-contained

function Spinner() {
  return (
    <svg
      className="animate-spin h-6 w-6 text-[var(--accent)]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
