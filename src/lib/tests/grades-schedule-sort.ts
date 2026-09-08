import {
  addDaysToMoscowDateKey,
  combineDateAndTimeMoscow,
  getMoscowDateKey,
  getMoscowWeekdayFromDateKey,
  parseCrmDate,
} from '@/lib/lesson-datetime';
import { getSlotsForWeekdayFromList } from '@/lib/schedule-utils';
import type { WeeklyScheduleSlot } from '@/types/tutor';

export interface UpcomingScheduleOccurrence {
  studentId: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  /** Index of the student inside `slot.studentIds` — schedule order tie-breaker. */
  studentIndexInSlot: number;
}

const LOOKAHEAD_DAYS = 14;

function occurrenceEndMs(dateKey: string, endTime: string): number {
  const iso = combineDateAndTimeMoscow(dateKey, endTime);
  const parsed = parseCrmDate(iso);
  return parsed?.getTime() ?? 0;
}

/**
 * Next weekly-slot occurrence for a student that has not finished yet
 * (end time in Moscow is still in the future), scanning forward from `now`.
 */
export function findNextUpcomingScheduleOccurrence(
  studentId: string,
  slots: WeeklyScheduleSlot[],
  now: Date = new Date(),
): UpcomingScheduleOccurrence | null {
  const todayKey = getMoscowDateKey(now);
  if (!todayKey) return null;

  const nowMs = now.getTime();

  for (let dayOffset = 0; dayOffset < LOOKAHEAD_DAYS; dayOffset += 1) {
    const dateKey = addDaysToMoscowDateKey(todayKey, dayOffset);
    if (!dateKey) continue;

    const weekday = getMoscowWeekdayFromDateKey(dateKey);
    const daySlots = getSlotsForWeekdayFromList(slots, weekday);

    for (const slot of daySlots) {
      const studentIndexInSlot = slot.studentIds.indexOf(studentId);
      if (studentIndexInSlot < 0) continue;

      const endMs = occurrenceEndMs(dateKey, slot.endTime);
      if (endMs <= nowMs) continue;

      return {
        studentId,
        dateKey,
        startTime: slot.startTime,
        endTime: slot.endTime,
        studentIndexInSlot,
      };
    }
  }

  return null;
}

export function compareUpcomingScheduleOccurrences(
  a: UpcomingScheduleOccurrence | null,
  b: UpcomingScheduleOccurrence | null,
): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  if (a.dateKey !== b.dateKey) {
    return a.dateKey.localeCompare(b.dateKey);
  }
  if (a.startTime !== b.startTime) {
    return a.startTime.localeCompare(b.startTime);
  }
  return a.studentIndexInSlot - b.studentIndexInSlot;
}

/**
 * Sort student ids by nearest upcoming schedule occurrence.
 * Within the same slot, preserves `slot.studentIds` order.
 * Students with no upcoming occurrence go last (stable by input order).
 */
export function sortStudentIdsByUpcomingSchedule(
  studentIds: string[],
  slots: WeeklyScheduleSlot[],
  now: Date = new Date(),
): string[] {
  const decorated = studentIds.map((studentId, originalIndex) => ({
    studentId,
    originalIndex,
    occurrence: findNextUpcomingScheduleOccurrence(studentId, slots, now),
  }));

  decorated.sort((a, b) => {
    const byOccurrence = compareUpcomingScheduleOccurrences(
      a.occurrence,
      b.occurrence,
    );
    if (byOccurrence !== 0) return byOccurrence;
    return a.originalIndex - b.originalIndex;
  });

  return decorated.map((item) => item.studentId);
}
