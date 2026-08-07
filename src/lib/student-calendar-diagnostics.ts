import { getMoscowDateKey } from '@/lib/lesson-datetime';
import type { Lesson } from '@/types/tutor';

export interface StudentCalendarDiagnosticsInput {
  lessons: Lesson[];
  scheduleSlotsCount: number;
  calendarYear: number;
  calendarMonth: number;
  generatedLessonsCount: number;
  upcomingLessonsCount: number;
}

export interface StudentCalendarVisibleDiagnostics {
  targetYear: number;
  targetMonth: number;
  visibleCount: number;
  sampleDateKeys: string[];
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function countLessonsInCalendarMonth(
  lessons: Lesson[],
  year: number,
  month: number,
): { visibleCount: number; sampleDateKeys: string[] } {
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const keys = new Set<string>();

  for (const lesson of lessons) {
    const dateKey = getMoscowDateKey(lesson.date);
    if (!DATE_KEY_PATTERN.test(dateKey)) {
      continue;
    }

    if (dateKey.startsWith(monthPrefix)) {
      keys.add(dateKey);
    }
  }

  const sorted = [...keys].sort();
  return {
    visibleCount: sorted.length,
    sampleDateKeys: sorted.slice(0, 5),
  };
}

export function getFirstLastGeneratedLessonDates(
  lessons: Lesson[],
): { first: string | null; last: string | null } {
  const generatedKeys = lessons
    .filter((lesson) => lesson.id.startsWith('gen-'))
    .map((lesson) => getMoscowDateKey(lesson.date))
    .filter((dateKey) => DATE_KEY_PATTERN.test(dateKey))
    .sort();

  return {
    first: generatedKeys[0] ?? null,
    last: generatedKeys.at(-1) ?? null,
  };
}

export function buildStudentCalendarVisibleDiagnostics(
  input: StudentCalendarDiagnosticsInput,
): StudentCalendarVisibleDiagnostics {
  const { visibleCount, sampleDateKeys } = countLessonsInCalendarMonth(
    input.lessons,
    input.calendarYear,
    input.calendarMonth,
  );

  return {
    targetYear: input.calendarYear,
    targetMonth: input.calendarMonth + 1,
    visibleCount,
    sampleDateKeys,
  };
}
