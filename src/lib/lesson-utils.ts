import {
  combineDateAndTimeMoscow,
  ensureLessonDateTime,
  getMoscowDateKey,
  normalizeTimeToHm,
} from '@/lib/lesson-datetime';
import type { Lesson } from '@/types/tutor';

export function isLessonChargeable(lesson: Lesson): boolean {
  if (lesson.isChargeable !== undefined) {
    return lesson.isChargeable;
  }

  if (lesson.status !== 'completed') return false;
  if (lesson.attendance === 'absent' || lesson.attendance === 'transferred') {
    return false;
  }
  if (
    lesson.attendance === 'present' ||
    lesson.attendance === 'late'
  ) {
    return true;
  }

  return false;
}

export function normalizeLesson(lesson: Lesson): Lesson {
  const withDateTime = ensureLessonDateTime(lesson);
  const normalized: Lesson = {
    ...withDateTime,
    endTime: withDateTime.endTime
      ? normalizeTimeToHm(withDateTime.endTime)
      : undefined,
    lessonType: lesson.lessonType ?? 'regular',
    isOutsideSchedule: lesson.isOutsideSchedule ?? false,
    makeupStatus: lesson.makeupStatus ?? 'none',
    isChargeable:
      lesson.isChargeable !== undefined
        ? lesson.isChargeable
        : isLessonChargeable({
            ...lesson,
            lessonType: lesson.lessonType ?? 'regular',
            isOutsideSchedule: lesson.isOutsideSchedule ?? false,
            makeupStatus: lesson.makeupStatus ?? 'none',
          }),
  };

  return normalized;
}

export function getLessonDateKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

export function getLocalDateKey(date: Date = new Date()): string {
  return getMoscowDateKey(date);
}

export function getLocalWeekday(date: Date = new Date()): number {
  return date.getDay();
}

export function isLessonOnLocalDate(
  lessonDateStr: string,
  date: Date = new Date(),
): boolean {
  return getMoscowDateKey(lessonDateStr) === getMoscowDateKey(date);
}

export function combineDateAndTime(date: string, time: string): string {
  return combineDateAndTimeMoscow(date, time);
}

export function generateLessonId(): string {
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
