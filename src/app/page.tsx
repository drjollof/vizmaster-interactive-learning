'use client';

import { useState, useEffect } from 'react';
import Workspace from '@/components/Workspace';
import { allExercises, courseModules } from '@/data';
import { useProgress } from '@/hooks/useProgress';
import { CheckCircle2, ChevronRight, Code2, GripVertical } from 'lucide-react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WelcomeDashboard from '@/components/WelcomeDashboard';

function extractPreviewData(code: string) {
  const listRegex = /([a-zA-Z0-9_]+)\s*=\s*\[([\s\S]*?)\]/g;
  const columns: string[] = [];
  const rowsRaw: any[][] = [];
  let match;

  while ((match = listRegex.exec(code)) !== null) {
    const varName = match[1].trim();
    const listContentStr = match[2].trim();
    const items = listContentStr.split(',').map(s => {
      let val = s.trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        return val.slice(1, -1);
      }
      return val;
    }).filter(s => s !== '');

    if (items.length > 0) {
      columns.push(varName);
      rowsRaw.push(items);
    }
  }

  if (columns.length === 0) return null;

  const numRows = Math.max(...rowsRaw.map(r => r.length));
  const rows: any[][] = [];
  for (let i = 0; i < numRows; i++) {
    const row = [];
    for (let j = 0; j < columns.length; j++) {
      row.push(rowsRaw[j][i] !== undefined ? rowsRaw[j][i] : '');
    }
    rows.push(row);
  }

  return { columns, rows };
}

// ─────────────────────────────────────────────────────────────────────────────
// Left Panel – Instructions + Dataset Preview + Progressive Hints
// ─────────────────────────────────────────────────────────────────────────────

interface LeftPanelProps {
  activeExercise: import('@/data').Exercise;
  previewData: { columns: string[]; rows: any[][] } | null;
}

function LeftPanel({ activeExercise, previewData }: LeftPanelProps) {
  const [revealedHints, setRevealedHints] = useState(0);

  // Reset hints whenever the exercise changes
  useEffect(() => {
    setRevealedHints(0);
  }, [activeExercise.id]);

  const hints = activeExercise.hints ?? [];

  return (
    <Panel defaultSize={40} minSize={25} className="flex-1 overflow-y-auto p-6 bg-background">
      {/* ── Markdown Instructions ── */}
      <div className="prose prose-sm prose-invert max-w-none prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeExercise.markdown}</ReactMarkdown>
      </div>

      {/* ── Dataset Preview ── */}
      {previewData && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-200 mb-4">Dataset Preview</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="table-auto w-full text-sm text-left text-gray-300 border-collapse">
              <thead className="bg-gray-800 text-xs uppercase text-gray-400">
                <tr>
                  {previewData.columns.map((col, idx) => (
                    <th key={idx} className="px-4 py-3 border-b border-gray-700 font-semibold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx} className="bg-white/5 even:bg-transparent hover:bg-white/10 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2 border-b border-gray-800/50">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Progressive Hints ── */}
      {hints.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Hints</h3>

          {/* Revealed hint callouts */}
          {hints.slice(0, revealedHints).map((hint, idx) => (
            <div
              key={idx}
              className="bg-blue-900/20 border-l-4 border-blue-500 text-blue-100 p-4 mb-3 rounded-r text-sm"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{hint}</ReactMarkdown>
            </div>
          ))}

          {/* "Get a Hint" button */}
          {revealedHints < hints.length && (
            <button
              onClick={() => setRevealedHints(prev => prev + 1)}
              className="mt-2 text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-2 border border-blue-900/50 bg-blue-900/10 px-4 py-2 rounded-md transition-colors"
            >
              💡 Get a Hint
              {revealedHints > 0 && (
                <span className="ml-1 text-xs text-blue-500/70">
                  ({revealedHints}/{hints.length} shown)
                </span>
              )}
            </button>
          )}

          {/* All hints exhausted message */}
          {revealedHints === hints.length && hints.length > 0 && (
            <p className="mt-3 text-xs text-zinc-500 italic">
              All {hints.length} hint{hints.length !== 1 ? 's' : ''} revealed.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

export default function Home() {

  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const { completedExerciseIds, markCompleted } = useProgress();

  const currentIndex = activeExerciseId ? allExercises.findIndex(e => e.id === activeExerciseId) : -1;
  const activeExercise = currentIndex >= 0 ? allExercises[currentIndex] : null;
  const hasNext = currentIndex >= 0 && currentIndex < allExercises.length - 1;

  let previewData = null;
  if (activeExercise) {
    if (activeExercise.dataset_preview) {
      previewData = activeExercise.dataset_preview;
    } else if (activeExercise.starting_code) {
      previewData = extractPreviewData(activeExercise.starting_code);
    }
  }

  const handleNext = () => {
    if (hasNext) {
      setActiveExerciseId(allExercises[currentIndex + 1].id);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      
      {/* ── SIDEBAR (Always Visible, Fixed Width) ─────────────────────── */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-[#111113] border-r border-panel-border overflow-hidden z-10">
        <div 
          className="p-4 border-b border-panel-border flex items-center gap-2 cursor-pointer hover:bg-[#1a1a1d] transition-colors shrink-0"
          onClick={() => setActiveExerciseId(null)}
        >
          <Code2 className="text-emerald-500" />
          <h1 className="font-bold text-lg tracking-tight">VizMaster</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {courseModules.map((module, mIdx) => (
            <details key={mIdx} className="group" open>
              <summary className="flex items-center gap-2 p-2 hover:bg-[#1a1a1d] rounded-md cursor-pointer list-none text-zinc-300 font-semibold text-sm transition-colors">
                <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                {module.title}
              </summary>
              <div className="mt-1 ml-4 border-l border-panel-border pl-2 space-y-1">
                {module.lessons.map((ex) => {
                  const isActive = ex.id === activeExerciseId;
                  const isCompleted = completedExerciseIds.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => setActiveExerciseId(ex.id)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 rounded-md transition-colors ${
                        isActive 
                          ? 'bg-[#27272a] text-white' 
                          : 'text-zinc-400 hover:bg-[#1a1a1d] hover:text-zinc-200'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate flex-1">{ex.title}</span>
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────── */}
      <div className="flex-1 h-full relative flex flex-col bg-background overflow-hidden">
        {!activeExercise ? (
          <WelcomeDashboard onStartLesson={(id) => setActiveExerciseId(id)} />
        ) : (
          <Group orientation="horizontal" className="flex-1 w-full h-full">
            {/* Markdown Instructions + Hints */}
            <LeftPanel
              activeExercise={activeExercise}
              previewData={previewData}
            />

            {/* ── DRAG HANDLE ────────────────────────────────────────────────── */}
            <Separator className="group relative w-1.5 bg-panel-border hover:bg-zinc-600 transition-colors cursor-col-resize flex items-center justify-center shrink-0 z-10">
              <GripVertical size={16} className="text-zinc-500 group-hover:text-zinc-300 transition-colors pointer-events-none" />
            </Separator>

            {/* Code Workspace */}
            <Panel defaultSize={60} minSize={30} className="flex flex-col bg-[#1e1e1e] overflow-hidden">
              <Workspace 
                exercise={activeExercise} 
                onSuccess={() => markCompleted(activeExercise.id)}
                onNext={handleNext}
                hasNext={hasNext}
              />
            </Panel>
          </Group>
        )}
      </div>
    </div>
  );
}
