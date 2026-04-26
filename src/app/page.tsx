'use client';

import { useState } from 'react';
import Workspace from '@/components/Workspace';
import { allExercises, courseModules } from '@/data';
import { useProgress } from '@/hooks/useProgress';
import { CheckCircle2, ChevronRight, Code2, GripVertical } from 'lucide-react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [activeExerciseId, setActiveExerciseId] = useState(allExercises[0]?.id);
  const { completedExerciseIds, markCompleted } = useProgress();

  const currentIndex = allExercises.findIndex(e => e.id === activeExerciseId);
  const activeExercise = allExercises[currentIndex] || allExercises[0];
  const hasNext = currentIndex >= 0 && currentIndex < allExercises.length - 1;

  const handleNext = () => {
    if (hasNext) {
      setActiveExerciseId(allExercises[currentIndex + 1].id);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Group direction="horizontal" className="flex-1 w-full h-full">
        {/* ── LEFT PANEL (Sidebar + Instructions) ───────────────────────── */}
        <Panel defaultSize={40} minSize={25} className="flex bg-background border-r border-panel-border overflow-hidden">
          {/* Sidebar */}
          <div className="w-[280px] flex flex-col bg-[#111113] border-r border-panel-border shrink-0">
            <div className="p-4 border-b border-panel-border flex items-center gap-2">
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

          {/* Markdown Instructions */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{activeExercise.markdown}</ReactMarkdown>
            </div>
          </div>
        </Panel>

        {/* ── DRAG HANDLE ────────────────────────────────────────────────── */}
        <Separator className="group relative w-1.5 bg-panel-border hover:bg-zinc-600 transition-colors cursor-col-resize flex items-center justify-center shrink-0 z-10">
          <GripVertical size={16} className="text-zinc-500 group-hover:text-zinc-300 transition-colors pointer-events-none" />
        </Separator>

        {/* ── RIGHT PANEL (Code Workspace) ───────────────────────────────── */}
        <Panel defaultSize={60} minSize={30} className="flex flex-col bg-[#1e1e1e] overflow-hidden">
          <Workspace 
            exercise={activeExercise} 
            onSuccess={() => markCompleted(activeExercise.id)}
            onNext={handleNext}
            hasNext={hasNext}
          />
        </Panel>
      </Group>
    </div>
  );
}
