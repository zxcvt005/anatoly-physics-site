import { pruneOrphanScheduledRegularLessons } from '@/lib/lesson-orphans';
import { normalizeLesson } from '@/lib/lesson-utils';
import type { Lesson } from '@/types/tutor';

export const LESSONS_STORAGE_KEY = 'tutor-lessons-mock-v1';

export function readLessonsFromLocalStorage(fallback: Lesson[]): Lesson[] {
  if (typeof window === 'undefined') {
    return pruneOrphanScheduledRegularLessons(fallback.map(normalizeLesson));
  }

  const stored = window.localStorage.getItem(LESSONS_STORAGE_KEY);

  if (!stored) {
    return pruneOrphanScheduledRegularLessons(fallback.map(normalizeLesson));
  }

  try {
    return pruneOrphanScheduledRegularLessons(
      (JSON.parse(stored) as Lesson[]).map(normalizeLesson),
    );
  } catch {
    return pruneOrphanScheduledRegularLessons(fallback.map(normalizeLesson));
  }
}

export function writeLessonsToLocalStorage(lessons: Lesson[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(lessons));
}
