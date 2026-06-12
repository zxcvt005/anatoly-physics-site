import type { TrialLesson } from '@/types/tutor';

export const TRIAL_LESSONS_STORAGE_KEY = 'tutor-trial-lessons-mock-v1';

export function readTrialLessonsFromLocalStorage(
  fallback: TrialLesson[],
): TrialLesson[] {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const stored = window.localStorage.getItem(TRIAL_LESSONS_STORAGE_KEY);

  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as TrialLesson[];
  } catch {
    return fallback;
  }
}

export function writeTrialLessonsToLocalStorage(trialLessons: TrialLesson[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TRIAL_LESSONS_STORAGE_KEY, JSON.stringify(trialLessons));
}
