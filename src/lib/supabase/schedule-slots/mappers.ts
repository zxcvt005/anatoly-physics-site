import { normalizeWeekday, sortSlotsByStartTime } from '@/lib/schedule-utils';
import type {
  ScheduleSlotPatternPeriod,
  WeeklyScheduleSlot,
} from '@/types/tutor';
import type { ScheduleSlotWithStudentsRow } from './types';

export function formatTimeFromDb(time: string): string {
  return time.slice(0, 5);
}

export function toDbTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export function extractStudentAppId(
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

type PatternHistoryJson = {
  weekday?: number;
  startTime?: string;
  endTime?: string;
  studentIds?: string[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
  studentJoinedAt?: Record<string, string>;
};

function parsePatternHistory(
  value: ScheduleSlotWithStudentsRow['pattern_history'],
): ScheduleSlotPatternPeriod[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  return (value as PatternHistoryJson[]).map((period) => ({
    weekday: normalizeWeekday(Number(period.weekday ?? 0)),
    startTime: formatTimeFromDb(String(period.startTime ?? '')),
    endTime: formatTimeFromDb(String(period.endTime ?? '')),
    studentIds: Array.isArray(period.studentIds)
      ? period.studentIds.map(String)
      : [],
    effectiveFrom: String(period.effectiveFrom ?? ''),
    effectiveTo:
      period.effectiveTo === undefined ? null : period.effectiveTo,
    studentJoinedAt: period.studentJoinedAt
      ? { ...period.studentJoinedAt }
      : undefined,
  }));
}

function patternHistoryToDb(
  history: ScheduleSlotPatternPeriod[] | undefined,
): PatternHistoryJson[] {
  if (!history || history.length === 0) {
    return [];
  }

  return history.map((period) => {
    const joinedEntries = Object.entries(period.studentJoinedAt ?? {}).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    );

    return {
      weekday: period.weekday,
      startTime: period.startTime,
      endTime: period.endTime,
      studentIds: [...period.studentIds],
      effectiveFrom: period.effectiveFrom,
      effectiveTo: period.effectiveTo ?? null,
      studentJoinedAt:
        joinedEntries.length > 0 ? Object.fromEntries(joinedEntries) : undefined,
    };
  });
}

export function scheduleSlotRowToWeeklySlot(
  row: ScheduleSlotWithStudentsRow,
): WeeklyScheduleSlot {
  const studentJoinedAt: Record<string, string> = {};
  const studentIds = (row.schedule_slot_students ?? [])
    .map((entry) => {
      const appId = extractStudentAppId(entry.students);
      if (!appId) {
        return undefined;
      }

      if (entry.created_at) {
        studentJoinedAt[appId] = entry.created_at;
      }

      return appId;
    })
    .filter((appId): appId is string => Boolean(appId));

  const patternHistory = parsePatternHistory(row.pattern_history);

  return {
    id: row.app_id,
    weekday: normalizeWeekday(row.weekday),
    startTime: formatTimeFromDb(row.start_time),
    endTime: formatTimeFromDb(row.end_time),
    studentIds,
    comment: row.comment ?? undefined,
    createdAt: row.created_at,
    effectiveFrom: row.effective_from ?? row.created_at,
    patternHistory,
    studentJoinedAt:
      Object.keys(studentJoinedAt).length > 0 ? studentJoinedAt : undefined,
  };
}

export function weeklySlotToInsertRow(slot: WeeklyScheduleSlot) {
  return {
    app_id: slot.id,
    weekday: slot.weekday,
    start_time: toDbTime(slot.startTime),
    end_time: toDbTime(slot.endTime),
    comment: slot.comment ?? null,
    effective_from: slot.effectiveFrom ?? slot.createdAt ?? new Date().toISOString(),
    pattern_history: patternHistoryToDb(slot.patternHistory),
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
    effective_from:
      merged.effectiveFrom ?? merged.createdAt ?? existing.createdAt ?? null,
    pattern_history: patternHistoryToDb(merged.patternHistory),
  };
}

export function mapScheduleSlotRows(
  rows: ScheduleSlotWithStudentsRow[] | null,
): WeeklyScheduleSlot[] {
  return sortSlotsByStartTime(
    (rows ?? []).map(scheduleSlotRowToWeeklySlot),
  );
}
