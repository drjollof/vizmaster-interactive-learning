import React from 'react';
import { allExercises } from '@/data';
import { useProgress } from '@/hooks/useProgress';
import { PlayCircle, Trophy } from 'lucide-react';

export default function WelcomeDashboard({ onStartLesson }: { onStartLesson: (id: string) => void }) {
  const { completedExerciseIds } = useProgress();

  const totalExercises = allExercises.length;
  const completedCount = completedExerciseIds.length;
  const progressPercent = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;

  const handleResume = () => {
    const firstUncompleted = allExercises.find(ex => !completedExerciseIds.includes(ex.id));
    if (firstUncompleted) {
      onStartLesson(firstUncompleted.id);
    } else if (allExercises.length > 0) {
      // If all completed, just go to first
      onStartLesson(allExercises[0].id);
    }
  };

  const isAllCompleted = completedCount === totalExercises && totalExercises > 0;

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-[#1e1e1e] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="z-10 max-w-2xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Welcome to <span className="text-emerald-400">VizMaster</span>!
          </h1>
          <p className="text-xl text-zinc-400">
            Master data visualization with interactive Python exercises.
          </p>
        </div>

        <div className="bg-[#252526] border border-panel-border rounded-2xl p-8 shadow-2xl mx-auto max-w-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-zinc-300">Your Progress</span>
            <span className="text-sm font-mono text-emerald-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 mb-8 overflow-hidden border border-zinc-700">
            <div 
              className="bg-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          {isAllCompleted ? (
            <div className="flex flex-col items-center gap-4">
              <Trophy className="text-yellow-500 w-12 h-12" />
              <p className="text-zinc-300 font-medium">You have completed all exercises!</p>
              <button 
                onClick={handleResume}
                className="w-full py-3 px-4 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Review Exercises
              </button>
            </div>
          ) : (
            <button 
              onClick={handleResume}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              <PlayCircle size={20} />
              {completedCount === 0 ? 'Start Learning' : 'Resume Learning'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
