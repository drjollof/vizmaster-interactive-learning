import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { saveProgressToCloud, getProgressFromCloud } from '@/actions/progress';

export function useProgress() {
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);
  const { isSignedIn, isLoaded } = useAuth();

  // 1. Initial load from local storage
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

  // 2. Hydrate from cloud when user signs in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      getProgressFromCloud().then((cloudProgress) => {
        if (cloudProgress.length > 0) {
          setCompletedExerciseIds((prev) => {
            const merged = Array.from(new Set([...prev, ...cloudProgress]));
            localStorage.setItem('completed_exercises', JSON.stringify(merged));
            return merged;
          });
        }
      }).catch(err => {
        console.error('Failed to hydrate progress from cloud', err);
      });
    }
  }, [isLoaded, isSignedIn]);

  const markCompleted = (id: string) => {
    setCompletedExerciseIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      localStorage.setItem('completed_exercises', JSON.stringify(updated));
      return updated;
    });

    // Async sync to cloud if logged in
    if (isSignedIn) {
      saveProgressToCloud(id).catch(err => {
        console.error('Failed to save progress to cloud', err);
      });
    }
  };

  return { completedExerciseIds, markCompleted };
}
