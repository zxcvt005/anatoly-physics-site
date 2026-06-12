import { normalizeWeekday, sortSlotsByStartTime } from '@/lib/schedule-utils';
import type { WeeklyScheduleSlot } from '@/types/tutor';
import type { ScheduleSlotWithStudentsRow } from './types';

export function formatTimeFromDb(time: string): string {
  return time.slice(0, 5);
}

export function toDbTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function extractStudentAppId(
  students: { app_id: string } | { app_id: string }[] | null | undefined,
): string | undefined {
  if (!students) {
    return undefined;
  }

  if (Array.isArray(students)) {
    return students[0]?.app_id;
  }

  return students.app_id;
}

export function scheduleSlotRowToWeeklySlot(
  row: ScheduleSlotWithStudentsRow,
): WeeklyScheduleSlot {
  const studentIds = (row.schedule_slot_students ?? [])
    .map((entry) => extractStudentAppId(entry.students))
    .filter((appId): appId is string => Boolean(appId));

  return {
    id: row.app_id,
    weekday: normalizeWeekday(row.weekday),
    startTime: formatTimeFromDb(row.start_time),
    endTime: formatTimeFromDb(row.end_time),
    studentIds,
    comment: row.comment ?? undefined,
  };
}

export function weeklySlotToInsertRow(slot: WeeklyScheduleSlot) {
  return {
    app_id: slot.id,
    weekday: slot.weekday,
    start_time: toDbTime(slot.startTime),
    end_time: toDbTime(slot.endTime),
    comment: slot.comment ?? null,
  };
}

export function weeklySlotPatchToUpdateRow(
  patch: Partial<WeeklyScheduleSlot>,
  existing: WeeklyScheduleSlot,
) {
  const merged: WeeklyScheduleSlot = {
    ...existing,
    ...patch,
    studentIds: patch.studentIds ? [...patch.studentIds] : existing.studentIds,
  };

  return {
    weekday: merged.weekday,
    start_time: toDbTime(merged.startTime),
    end_time: toDbTime(merged.endTime),
    comment: merged.comment ?? null,
  };
}

export function mapScheduleSlotRows(
  rows: ScheduleSlotWithStudentsRow[] | null,
): WeeklyScheduleSlot[] {
  return sortSlotsByStartTime(
    (rows ?? []).map(scheduleSlotRowToWeeklySlot),
  );
}
