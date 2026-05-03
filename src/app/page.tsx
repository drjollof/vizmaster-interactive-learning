'use client';

import { useState, useEffect, useRef } from 'react';
import Workspace from '@/components/Workspace';
import { allExercises, courseModules } from '@/data';
import { useProgress } from '@/hooks/useProgress';
import {
  CheckCircle2,
  ChevronRight,
  Code2,
  GripVertical,
  Menu,
  X,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Panel, Group, Separator, type PanelImperativeHandle } from 'react-resizable-panels';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WelcomeDashboard from '@/components/WelcomeDashboard';
import { Show, SignInButton, UserButton } from '@clerk/nextjs';

//  Utility hook: detect mobile viewport

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

//  Dataset preview helper 

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


//  Sidebar content – extracted so it can be rendered in both desktop & mobile


interface SidebarContentProps {
  activeExerciseId: string | null;
  completedExerciseIds: string[];
  onSelect: (id: string) => void;
  onLogoClick: () => void;
  onClose?: () => void; // mobile-only
  onCollapseSidebar?: () => void; // desktop-only: hides the sidebar
}

function SidebarContent({
  activeExerciseId,
  completedExerciseIds,
  onSelect,
  onLogoClick,
  onClose,
  onCollapseSidebar,
}: SidebarContentProps) {
  return (
    <>
      {/* Logo / brand */}
      <div
        className="p-4 border-b border-panel-border flex items-center justify-between gap-2 cursor-pointer hover:bg-[#1a1a1d] transition-colors shrink-0"
        onClick={onLogoClick}
      >
        <div className="flex items-center gap-2">
          <Code2 className="text-emerald-500" />
          <h1 className="font-bold text-lg tracking-tight">VizMaster</h1>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Desktop: collapse the sidebar */}
          {onCollapseSidebar && (
            <button
              onClick={onCollapseSidebar}
              aria-label="Hide sidebar"
              title="Hide Sidebar"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#2a2a2d] transition-colors"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#2a2a2d] transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Exercise list */}
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
                    onClick={() => onSelect(ex.id)}
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

      {/* User Profile Section */}
      <div className="p-4 border-t border-panel-border shrink-0 bg-[#111113]">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-colors">
              Sign In
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <div className="flex items-center gap-3">
            <UserButton />
            <span className="text-sm font-medium text-zinc-300">My Account</span>
          </div>
        </Show>
      </div>
    </>
  );
}

//  Left Panel – Instructions + Dataset Preview + Progressive Hints


interface LeftPanelProps {
  activeExercise: import('@/data').Exercise;
  previewData: { columns: string[]; rows: any[][] } | null;
  panelRef: React.Ref<PanelImperativeHandle>;
  isMobile: boolean;
}


function LeftPanel({ activeExercise, previewData, panelRef, isMobile }: LeftPanelProps) {
  const [revealedHints, setRevealedHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  // Reset hints and solution whenever the exercise changes
  useEffect(() => {
    setRevealedHints(0);
    setShowSolution(false);
  }, [activeExercise.id]);

  const hints = activeExercise.hints ?? [];
  const solutionCode = activeExercise.solution_code ?? null;

  return (
    <Panel
      panelRef={panelRef}
      defaultSize={isMobile ? 40 : 40}
      minSize={isMobile ? 0 : 25}
      collapsible={true}
      collapsedSize={0}
      className="flex-1 overflow-y-auto p-6 bg-background"
    >
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

      {/*  Progressive Hints  */}
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

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* "Get a Hint" button */}
            {revealedHints < hints.length && (
              <button
                onClick={() => setRevealedHints(prev => prev + 1)}
                className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-2 border border-blue-900/50 bg-blue-900/10 px-4 py-2 rounded-md transition-colors"
              >
                💡 Get a Hint
                {revealedHints > 0 && (
                  <span className="ml-1 text-xs text-blue-500/70">
                    ({revealedHints}/{hints.length} shown)
                  </span>
                )}
              </button>
            )}

            {/* "Hide Hints" button – only shown when at least one hint is revealed */}
            {revealedHints > 0 && (
              <button
                onClick={() => setRevealedHints(0)}
                className="text-sm font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-2 border border-zinc-700/50 bg-zinc-800/30 px-4 py-2 rounded-md transition-colors"
              >
                🙈 Hide Hints
              </button>
            )}
          </div>

          {/* All hints exhausted message */}
          {revealedHints === hints.length && hints.length > 0 && (
            <p className="mt-3 text-xs text-zinc-500 italic">
              All {hints.length} hint{hints.length !== 1 ? 's' : ''} revealed.
            </p>
          )}
        </div>
      )}

      {/* ── Show / Hide Solution ── */}
      {solutionCode && (
        <div className="mt-6">
          <button
            onClick={() => setShowSolution(prev => !prev)}
            className={`text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
              showSolution
                ? 'text-orange-300 border-orange-700/60 bg-orange-950/40 hover:bg-orange-950/60'
                : 'text-orange-400 border-orange-800/50 bg-orange-950/20 hover:bg-orange-950/40 hover:text-orange-300'
            }`}
          >
            {showSolution ? '🔒 Hide Solution' : '⚠️ Show Solution'}
          </button>

          {showSolution && (
            <div className="mt-3 rounded-lg border border-orange-800/40 bg-orange-950/10 overflow-hidden">
              <div className="px-4 py-2 bg-orange-950/30 border-b border-orange-800/30">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Solution</p>
              </div>
              <div className="p-4 prose prose-sm prose-invert max-w-none prose-pre:bg-gray-900 prose-pre:border prose-pre:border-orange-900/40 prose-pre:!mt-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {`\`\`\`python\n${solutionCode}\n\`\`\``}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

//  Home (App Shell)


export default function Home() {
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  //  Sidebar collapsed state (desktop only)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { completedExerciseIds, markCompleted } = useProgress();
  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const isMobile = useIsMobile();

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

  const handleSelectExercise = (id: string) => {
    setActiveExerciseId(id);
    setIsMobileMenuOpen(false); // auto-close mobile menu on selection
  };

  const handleLogoClick = () => {
    setActiveExerciseId(null);
    setIsMobileMenuOpen(false);
  };

  // Desktop sidebar toggle
  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  // Mobile instructions panel toggle (imperative, independent of sidebar)
  const toggleInstructionsPanel = () => {
    if (!leftPanelRef.current) return;
    if (leftPanelRef.current.isCollapsed()) {
      leftPanelRef.current.expand();
    } else {
      leftPanelRef.current.collapse();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background text-foreground">

      {/*  MOBILE HEADER (visible only below md)  */}
      <header className="flex md:hidden items-center justify-between px-4 h-14 bg-[#111113] border-b border-panel-border shrink-0 z-40">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Code2 className="text-emerald-500" size={20} />
          <span className="font-bold text-base tracking-tight">VizMaster</span>
        </div>
        {/* Toggle instructions button on mobile (only in workspace view) */}
        {activeExercise ? (
          <button
            onClick={toggleInstructionsPanel}
            aria-label="Toggle instructions panel"
            className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
          >
            <BookOpen size={20} />
          </button>
        ) : (
          <div className="w-9" /> /* spacer to keep logo centered */
        )}
      </header>

      {/*  BODY ROW (sidebar + main content)  */}
      <div className="flex flex-1 overflow-hidden">

        {/*  DESKTOP SIDEBAR (hidden on mobile)  */}
        {isSidebarCollapsed ? (
          /* Collapsed strip: just the expand icon */
          <div className="hidden md:flex flex-col items-center bg-[#111113] border-r border-panel-border py-3 px-1.5 shrink-0">
            <button
              onClick={toggleSidebar}
              aria-label="Show sidebar"
              title="Show Sidebar"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-[#2a2a2d] transition-colors"
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        ) : (
          /* Expanded: full sidebar */
          <div className="hidden md:flex w-64 flex-shrink-0 flex-col bg-[#111113] border-r border-panel-border overflow-hidden z-10">
            <SidebarContent
              activeExerciseId={activeExerciseId}
              completedExerciseIds={completedExerciseIds}
              onSelect={handleSelectExercise}
              onLogoClick={handleLogoClick}
              onCollapseSidebar={toggleSidebar}
            />
          </div>
        )}

        {/*  MOBILE SIDEBAR OVERLAY */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-[#111113] border-r border-panel-border shadow-2xl md:hidden animate-in slide-in-from-left duration-200">
              <SidebarContent
                activeExerciseId={activeExerciseId}
                completedExerciseIds={completedExerciseIds}
                onSelect={handleSelectExercise}
                onLogoClick={handleLogoClick}
                onClose={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </>
        )}

        {/* MAIN CONTENT AREA  */}
        <div className="flex-1 h-full relative flex flex-col bg-background overflow-hidden">
          {!activeExercise ? (
            <WelcomeDashboard onStartLesson={(id) => setActiveExerciseId(id)} />
          ) : (
            <>
              {/* Toggle Instructions button is now in the Sidebar logo row */}

              <Group
                orientation={isMobile ? 'vertical' : 'horizontal'}
                className="flex-1 w-full h-full overflow-hidden"
              >
                {/* Instructions Panel */}
                <LeftPanel
                  activeExercise={activeExercise}
                  previewData={previewData}
                  panelRef={leftPanelRef}
                  isMobile={isMobile}
                />

                {/*  DRAG HANDLE  */}
                <Separator
                  className={`group relative bg-panel-border hover:bg-zinc-600 transition-colors flex items-center justify-center shrink-0 z-10 ${
                    isMobile
                      ? 'h-2 w-full cursor-row-resize'
                      : 'w-1.5 cursor-col-resize'
                  }`}
                >
                  <GripVertical
                    size={16}
                    className={`text-zinc-500 group-hover:text-zinc-300 transition-colors pointer-events-none ${
                      isMobile ? 'rotate-90' : ''
                    }`}
                  />
                </Separator>

                {/* Code Workspace */}
                <Panel
                  defaultSize={60}
                  minSize={30}
                  className="flex flex-col bg-[#1e1e1e] overflow-hidden"
                >
                  <Workspace
                    exercise={activeExercise}
                    onSuccess={() => markCompleted(activeExercise.id)}
                    onNext={handleNext}
                    hasNext={hasNext}
                  />
                </Panel>
              </Group>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
