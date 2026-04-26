import { useState, useEffect } from 'react';

export function useProgress() {
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('completed_exercises');
      if (stored) {
        setCompletedExerciseIds(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse completed_exercises', e);
    }
  }, []);

  const markCompleted = (id: string) => {
    setCompletedExerciseIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      localStorage.setItem('completed_exercises', JSON.stringify(updated));
      return updated;
    });
  };

  return { completedExerciseIds, markCompleted };
}
