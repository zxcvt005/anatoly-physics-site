import { sortSlotsByStartTime } from '@/lib/schedule-utils';
import type { WeeklyScheduleSlot } from '@/types/tutor';

export const SCHEDULE_SLOTS_STORAGE_KEY = 'tutor-schedule-slots-mock-v1';

export function readScheduleSlotsFromLocalStorage(
  fallback: WeeklyScheduleSlot[],
): WeeklyScheduleSlot[] {
  if (typeof window === 'undefined') {
    return sortSlotsByStartTime(fallback);
  }

  const stored = localStorage.getItem(SCHEDULE_SLOTS_STORAGE_KEY);
  if (!stored) {
    return sortSlotsByStartTime(fallback);
  }

  try {
    return sortSlotsByStartTime(JSON.parse(stored) as WeeklyScheduleSlot[]);
  } catch {
    return sortSlotsByStartTime(fallback);
  }
}

export function writeScheduleSlotsToLocalStorage(
  slots: WeeklyScheduleSlot[],
): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(SCHEDULE_SLOTS_STORAGE_KEY, JSON.stringify(slots));
}
