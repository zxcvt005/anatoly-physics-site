import type { Lesson } from '@/types/tutor';
import {
  CRM_DATE_DISPLAY_FALLBACK,
  CRM_TIMEZONE,
  formatCrmDate,
  formatCrmMoscowDateKey,
  getCrmDateMs,
  normalizeDateKeyToDashes,
  parseCrmDate,
} from '@/lib/crm-datetime';
import { formatTimeRange } from '@/lib/tutor-calculations';

/** CRM lesson times are always shown and stored in Moscow time. */
export const LESSON_TIMEZONE = CRM_TIMEZONE;

const MOSCOW_OFFSET = '+03:00';

export function getMoscowDateKey(date: Date | string = new Date()): string {
  if (date instanceof Date) {
    if (!Number.isFinite(date.getTime())) {
      return '';
    }

    return formatCrmMoscowDateKey(date);
  }

  return formatCrmMoscowDateKey(date);
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
  const parsed =
    date instanceof Date
      ? Number.isFinite(date.getTime())
        ? date
        : null
      : parseCrmDate(date);

  if (!parsed) {
    return new Date().getDay();
  }

  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: LESSON_TIMEZONE,
    weekday: 'short',
  }).format(parsed);

  return MOSCOW_WEEKDAY_TO_NUMBER[short] ?? parsed.getDay();
}

export function getMoscowWeekdayFromDateKey(dateKey: string): number {
  return getMoscowWeekday(`${dateKey}T12:00:00${MOSCOW_OFFSET}`);
}

/** Adds calendar days in Moscow time (dateKey is YYYY-MM-DD in Moscow). */
export function addDaysToMoscowDateKey(dateKey: string, days: number): string {
  const normalizedDateKey = normalizeDateKeyToDashes(dateKey);
  const anchor = parseCrmDate(`${normalizedDateKey}T12:00:00${MOSCOW_OFFSET}`);
  if (!anchor) {
    return '';
  }

  anchor.setUTCDate(anchor.getUTCDate() + days);
  return getMoscowDateKey(anchor);
}

/** Days in a Moscow calendar month; month is 0-based (JS convention). */
export function getDaysInMoscowMonth(year: number, month: number): number {
  const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear =
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  if (month === 1 && isLeapYear) {
    return 29;
  }

  return monthLengths[month] ?? 30;
}

/** Monday-first offset (0–6) for the first day of a Moscow calendar month. */
export function getMoscowMonthStartOffset(year: number, month: number): number {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const weekday = getMoscowWeekdayFromDateKey(monthKey);
  const startOffset = weekday - 1;
  return startOffset < 0 ? 6 : startOffset;
}

/** Grid cells for a Moscow calendar month; month is 0-based. */
export function buildMoscowCalendarCells(
  year: number,
  month: number,
): (number | null)[] {
  const startOffset = getMoscowMonthStartOffset(year, month);
  const daysInMonth = getDaysInMoscowMonth(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  return cells;
}
/** Moscow calendar Y-M-D; month is 0-based (JS Date convention). */
export function getMoscowCalendarParts(date: Date | string = new Date()): {
  year: number;
  month: number;
  day: number;
  dateKey: string;
} {
  const dateKey = getMoscowDateKey(date);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const fallback = date instanceof Date ? date : new Date();
    const fallbackKey = getMoscowDateKey(fallback);

    if (/^\d{4}-\d{2}-\d{2}$/.test(fallbackKey)) {
      const [year, month, day] = fallbackKey.split('-').map(Number);
      return { year, month: month - 1, day, dateKey: fallbackKey };
    }

    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth(),
      day: fallback.getDate(),
      dateKey: fallbackKey,
    };
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month: month - 1, day, dateKey };
}

export function formatMoscowMonthYear(date: Date | string = new Date()): string {
  const { year, month } = getMoscowCalendarParts(date);
  const anchor = parseCrmDate(
    `${year}-${String(month + 1).padStart(2, '0')}-01T12:00:00${MOSCOW_OFFSET}`,
  );

  if (!anchor) {
    return CRM_DATE_DISPLAY_FALLBACK;
  }

  const formatted = new Intl.DateTimeFormat('ru-RU', {
    timeZone: LESSON_TIMEZONE,
    month: 'long',
    year: 'numeric',
  }).format(anchor);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Wall-clock start time in Moscow (HH:mm), independent of browser timezone. */
export function formatLessonStartTime(dateStr: string): string {
  return formatCrmDate(
    dateStr,
    {
      hour: '2-digit',
      minute: '2-digit',
    },
    LESSON_TIMEZONE,
  );
}

export function formatLessonDateInMoscow(
  dateStr: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return formatCrmDate(dateStr, options, LESSON_TIMEZONE);
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

export { getCrmDateMs, normalizeDateKeyToDashes, parseCrmDate };
