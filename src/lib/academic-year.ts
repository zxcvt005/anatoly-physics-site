import { getMoscowDateKey } from '@/lib/lesson-datetime';
import type { Lesson } from '@/types/tutor';

/** Start of the current academic year (Moscow calendar day, YYYY-MM-DD). */
export const ACADEMIC_YEAR_START =
  process.env.NEXT_PUBLIC_ACADEMIC_YEAR_START?.trim() || '2026-09-01';

/** Whether the lesson falls on or after ACADEMIC_YEAR_START (Moscow date). */
export function isLessonInCurrentAcademicYear(lesson: Lesson): boolean {
  const lessonDateKey = getMoscowDateKey(lesson.date);
  if (!lessonDateKey) {
    return false;
  }

  return lessonDateKey >= ACADEMIC_YEAR_START;
}

/** Lessons included in academic progress metrics (conducted, absences, homework). */
export function filterLessonsForAcademicStats(lessons: Lesson[]): Lesson[] {
  return lessons.filter(isLessonInCurrentAcademicYear);
}
