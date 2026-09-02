import type { ScheduleSlot, Student, WeeklyScheduleSlot } from '@/types/tutor';
import { formatStudentShortName } from '@/lib/tutor-calculations';

export function normalizeWeekday(weekday: number | string): number {
  return typeof weekday === 'number' ? weekday : Number(weekday);
}

export function slotMatchesWeekday(
  slot: WeeklyScheduleSlot,
  weekday: number,
): boolean {
  return normalizeWeekday(slot.weekday) === weekday;
}

export function generateSlotId(): string {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function sortSlotsByStartTime(
  slots: WeeklyScheduleSlot[],
): WeeklyScheduleSlot[] {
  return [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getSlotsForWeekdayFromList(
  slots: WeeklyScheduleSlot[],
  weekday: number,
): WeeklyScheduleSlot[] {
  return sortSlotsByStartTime(
    slots.filter((slot) => slotMatchesWeekday(slot, weekday)),
  );
}

export function buildSlotsByWeekday(
  slots: WeeklyScheduleSlot[],
): Map<number, WeeklyScheduleSlot[]> {
  const map = new Map<number, WeeklyScheduleSlot[]>();
  for (const weekday of [1, 2, 3, 4, 5, 6, 0] as const) {
    map.set(weekday, getSlotsForWeekdayFromList(slots, weekday));
  }
  return map;
}

export function getScheduleForStudentFromSlots(
  slots: WeeklyScheduleSlot[],
  studentId: string,
): ScheduleSlot[] {
  const dayOrder = (day: number) => (day === 0 ? 7 : day);

  return slots
    .filter((slot) => slot.studentIds.includes(studentId))
    .map((slot) => ({
      id: `${slot.id}-${studentId}`,
      studentId,
      dayOfWeek: slot.weekday,
      time: slot.startTime,
    }))
    .sort((a, b) => dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek));
}

export function formatStudentCheckboxLabel(student: Student): string {
  return formatStudentShortName(student.name);
}
