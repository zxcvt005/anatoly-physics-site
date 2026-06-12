import type { Lesson } from '@/types/tutor';
import { formatTimeRange } from '@/lib/tutor-calculations';

/** CRM lesson times are always shown and stored in Moscow time. */
export const LESSON_TIMEZONE = 'Europe/Moscow';

const MOSCOW_OFFSET = '+03:00';

export function getMoscowDateKey(date: Date | string = new Date()): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-CA', { timeZone: LESSON_TIMEZONE }).format(
    value,
  );
}

const MOSCOW_WEEKDAY_TO_NUMBER: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** JS weekday (0 = Sunday) for the Moscow calendar day. */
export function getMoscowWeekday(date: Date | string = new Date()): number {
  const value = typeof date === 'string' ? new Date(date) : date;
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: LESSON_TIMEZONE,
    weekday: 'short',
  }).format(value);
  return MOSCOW_WEEKDAY_TO_NUMBER[short];
}

export function getMoscowWeekdayFromDateKey(dateKey: string): number {
  return getMoscowWeekday(`${dateKey}T12:00:00${MOSCOW_OFFSET}`);
}

/** Adds calendar days in Moscow time (dateKey is YYYY-MM-DD in Moscow). */
export function addDaysToMoscowDateKey(dateKey: string, days: number): string {
  const anchor = new Date(`${dateKey}T12:00:00${MOSCOW_OFFSET}`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return getMoscowDateKey(anchor);
}

/** Wall-clock start time in Moscow (HH:mm), independent of browser timezone. */
export function formatLessonStartTime(dateStr: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: LESSON_TIMEZONE,
  }).format(new Date(dateStr));
}

export function formatLessonDateInMoscow(
  dateStr: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('ru-RU', {
    ...options,
    timeZone: LESSON_TIMEZONE,
  }).format(new Date(dateStr));
}

export function normalizeTimeToHm(time: string): string {
  return time.trim().slice(0, 5);
}

export function formatLessonTimeRange(
  lesson: Pick<Lesson, 'date' | 'endTime'>,
): string {
  const start = formatLessonStartTime(lesson.date);
  if (!lesson.endTime) {
    return start;
  }

  return formatTimeRange(start, normalizeTimeToHm(lesson.endTime));
}

export function lessonStartTimeEquals(
  dateStr: string,
  startTime: string,
): boolean {
  return formatLessonStartTime(dateStr) === normalizeTimeToHm(startTime);
}

/**
 * Builds lesson_at ISO string with explicit Moscow offset (+03:00).
 * Avoids browser-local offset and UTC-midnight date-only values.
 */
export function combineDateAndTimeMoscow(date: string, time: string): string {
  const [hours, minutes] = normalizeTimeToHm(time).split(':').map(Number);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date}T${pad(hours)}:${pad(minutes)}:00${MOSCOW_OFFSET}`;
}

export function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Ensures lesson.date is a full Moscow-offset datetime before persistence.
 * Date-only values are expanded using endTime minus 60 minutes when possible.
 */
export function ensureLessonDateTime(lesson: Lesson): Lesson {
  if (!isDateOnlyString(lesson.date)) {
    return lesson;
  }

  const dateKey = lesson.date;
  if (lesson.endTime) {
    const [eh, em] = normalizeTimeToHm(lesson.endTime).split(':').map(Number);
    let total = eh * 60 + em - 60;
    if (total < 0) total += 24 * 60;
    const sh = Math.floor(total / 60) % 24;
    const sm = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      ...lesson,
      date: combineDateAndTimeMoscow(dateKey, `${pad(sh)}:${pad(sm)}`),
    };
  }

  return {
    ...lesson,
    date: combineDateAndTimeMoscow(dateKey, '12:00'),
  };
}
