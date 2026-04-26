import beginner from './beginner.json';
import intermediate from './intermediate.json';
import advanced from './advanced.json';

export type Exercise = typeof beginner[0] & {
  dataset_preview?: {
    columns: string[];
    rows: any[][];
  };
  hints?: string[];
};

export const allExercises: Exercise[] = [
  ...beginner,
  ...intermediate,
  ...advanced,
];

export const courseModules = [
  { title: 'Beginner', lessons: beginner },
  { title: 'Intermediate', lessons: intermediate },
  { title: 'Advanced', lessons: advanced },
];
