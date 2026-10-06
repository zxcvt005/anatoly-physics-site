import { addDaysToMoscowDateKey, getMoscowDateKey } from '@/lib/lesson-datetime';
import { getSlotPatternEffectiveFrom } from '@/lib/schedule-slot-patterns';
import type {
  ScheduleSlotPatternPeriod,
  Student,
  WeeklyScheduleSlot,
} from '@/types/tutor';

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

function collectStudentBoundCandidates(
  student: Student | undefined,
  todayDateKey: string,
): string[] {
  const candidates = [getUnmarkedWindowStart(todayDateKey)];

  if (student?.startedAt) {
    const key = timestampToMoscowDateKey(student.startedAt);
    if (key) candidates.push(key);
  }

  if (student?.createdAt) {
    const key = timestampToMoscowDateKey(student.createdAt);
    if (key) candidates.push(key);
  }

  return candidates;
}

/**
 * Lower bound for a regular slot occurrence per student (current pattern).
 * Uses the latest of: 60-day window, pattern effectiveFrom, student↔slot join,
 * startedAt, student creation.
 */
export function getUnmarkedLowerBoundForSlotStudent(
  slot: WeeklyScheduleSlot,
  studentId: string,
  student: Student | undefined,
  todayDateKey: string,
): string {
  const candidates = collectStudentBoundCandidates(student, todayDateKey);

  const patternFrom = getSlotPatternEffectiveFrom(slot);
  if (patternFrom) {
    const key = timestampToMoscowDateKey(patternFrom);
    if (key) candidates.push(key);
  }

  const studentJoinedAt = slot.studentJoinedAt?.[studentId];
  if (studentJoinedAt) {
    const joinKey = timestampToMoscowDateKey(studentJoinedAt);
    if (joinKey) {
      candidates.push(joinKey);
    }
  }

  return maxDateKey(...candidates);
}

/**
 * Lower bound for a historical (or current) pattern period occurrence.
 */
export function getUnmarkedLowerBoundForPatternPeriod(
  period: ScheduleSlotPatternPeriod,
  studentId: string,
  student: Student | undefined,
  todayDateKey: string,
): string {
  const candidates = collectStudentBoundCandidates(student, todayDateKey);

  const fromKey = timestampToMoscowDateKey(period.effectiveFrom);
  if (fromKey) {
    candidates.push(fromKey);
  }

  const studentJoinedAt = period.studentJoinedAt?.[studentId];
  if (studentJoinedAt) {
    const joinKey = timestampToMoscowDateKey(studentJoinedAt);
    if (joinKey) {
      candidates.push(joinKey);
    }
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
