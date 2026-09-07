import { addDaysToMoscowDateKey, getMoscowDateKey } from '@/lib/lesson-datetime';
import type { Student, WeeklyScheduleSlot } from '@/types/tutor';

export const UNMARKED_PAST_DAYS = 60; // примерно 2 месяца

/** Normalizes DB date or ISO timestamp to Moscow YYYY-MM-DD. */
export function timestampToMoscowDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return getMoscowDateKey(value);
}

function maxDateKey(...dateKeys: string[]): string {
  return dateKeys.reduce((max, key) => (key > max ? key : max));
}

export function getUnmarkedWindowStart(todayDateKey: string): string {
  return addDaysToMoscowDateKey(todayDateKey, -UNMARKED_PAST_DAYS);
}

/** Lower bound for retro one-off lessons (student-level only). */
export function getUnmarkedLowerBoundForStudent(
  student: Student | undefined,
  todayDateKey: string,
): string {
  const candidates = [getUnmarkedWindowStart(todayDateKey)];

  if (student?.startedAt) {
    const key = timestampToMoscowDateKey(student.startedAt);
    if (key) candidates.push(key);
  }

  if (student?.createdAt) {
    const key = timestampToMoscowDateKey(student.createdAt);
    if (key) candidates.push(key);
  }

  return maxDateKey(...candidates);
}

/**
 * Lower bound for a regular slot occurrence per student.
 * Uses the latest of: 60-day window, slot creation, student↔slot join, startedAt, student creation.
 */
export function getUnmarkedLowerBoundForSlotStudent(
  slot: WeeklyScheduleSlot,
  studentId: string,
  student: Student | undefined,
  todayDateKey: string,
): string {
  const candidates = [getUnmarkedWindowStart(todayDateKey)];

  if (slot.createdAt) {
    const key = timestampToMoscowDateKey(slot.createdAt);
    if (key) candidates.push(key);
  }

  const studentJoinedAt = slot.studentJoinedAt?.[studentId];
  if (studentJoinedAt) {
    const joinKey = timestampToMoscowDateKey(studentJoinedAt);
    const slotKey = slot.createdAt
      ? timestampToMoscowDateKey(slot.createdAt)
      : '';
    // Join rows used to be delete+reinserted on every slot edit, so
    // studentJoinedAt can be "today" for long-standing members.
    // Ignore a join date that is later than the slot itself.
    const joinLooksReset = Boolean(joinKey && slotKey && joinKey > slotKey);
    if (joinKey && !joinLooksReset) {
      candidates.push(joinKey);
    }
  }

  if (student?.startedAt) {
    const key = timestampToMoscowDateKey(student.startedAt);
    if (key) candidates.push(key);
  }

  if (student?.createdAt) {
    const key = timestampToMoscowDateKey(student.createdAt);
    if (key) candidates.push(key);
  }

  return maxDateKey(...candidates);
}

export function isDateWithinUnmarkedPastWindow(
  dateKey: string,
  todayDateKey: string,
  lowerBoundDateKey: string,
): boolean {
  if (dateKey >= todayDateKey) {
    return false;
  }

  return dateKey >= lowerBoundDateKey;
}
