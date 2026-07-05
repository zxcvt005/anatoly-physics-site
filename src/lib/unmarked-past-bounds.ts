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
    candidates.push(timestampToMoscowDateKey(student.startedAt));
  }

  if (student?.createdAt) {
    candidates.push(timestampToMoscowDateKey(student.createdAt));
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
    candidates.push(timestampToMoscowDateKey(slot.createdAt));
  }

  const studentJoinedAt = slot.studentJoinedAt?.[studentId];
  if (studentJoinedAt) {
    candidates.push(timestampToMoscowDateKey(studentJoinedAt));
  }

  if (student?.startedAt) {
    candidates.push(timestampToMoscowDateKey(student.startedAt));
  }

  if (student?.createdAt) {
    candidates.push(timestampToMoscowDateKey(student.createdAt));
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
