import { getMoscowDateKey } from '@/lib/lesson-datetime';
import { timestampToMoscowDateKey } from '@/lib/unmarked-past-bounds';
import type {
  ScheduleSlotPatternPeriod,
  WeeklyScheduleSlot,
} from '@/types/tutor';

function normalizeTimeHm(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function toDateKey(value: string): string {
  return timestampToMoscowDateKey(value);
}

/** Current pattern identity: weekday + time range. */
export function isSchedulePatternChange(
  existing: WeeklyScheduleSlot,
  patch: Partial<WeeklyScheduleSlot>,
): boolean {
  const nextWeekday = patch.weekday ?? existing.weekday;
  const nextStart = normalizeTimeHm(patch.startTime ?? existing.startTime);
  const nextEnd = normalizeTimeHm(patch.endTime ?? existing.endTime);

  return (
    nextWeekday !== existing.weekday ||
    nextStart !== normalizeTimeHm(existing.startTime) ||
    nextEnd !== normalizeTimeHm(existing.endTime)
  );
}

export function getSlotPatternEffectiveFrom(
  slot: Pick<WeeklyScheduleSlot, 'effectiveFrom' | 'createdAt'>,
): string | undefined {
  return slot.effectiveFrom ?? slot.createdAt;
}

export function buildCurrentPatternPeriod(
  slot: WeeklyScheduleSlot,
  effectiveTo?: string | null,
): ScheduleSlotPatternPeriod {
  return {
    weekday: slot.weekday,
    startTime: normalizeTimeHm(slot.startTime),
    endTime: normalizeTimeHm(slot.endTime),
    studentIds: [...slot.studentIds],
    effectiveFrom:
      getSlotPatternEffectiveFrom(slot) ?? getMoscowDateKey(),
    effectiveTo: effectiveTo ?? null,
    studentJoinedAt: slot.studentJoinedAt
      ? { ...slot.studentJoinedAt }
      : undefined,
  };
}

/**
 * All pattern periods for a slot: closed history + current open period.
 * Dates: effectiveFrom inclusive, effectiveTo exclusive (null = still active).
 */
export function listSlotPatternPeriods(
  slot: WeeklyScheduleSlot,
): ScheduleSlotPatternPeriod[] {
  const history = slot.patternHistory ?? [];
  return [...history, buildCurrentPatternPeriod(slot, null)];
}

export function isDateInPatternPeriod(
  dateKey: string,
  period: ScheduleSlotPatternPeriod,
): boolean {
  const fromKey = getMoscowDateKey(period.effectiveFrom) || period.effectiveFrom;
  if (dateKey < fromKey) {
    return false;
  }

  if (!period.effectiveTo) {
    return true;
  }

  const toKey = getMoscowDateKey(period.effectiveTo) || period.effectiveTo;
  return dateKey < toKey;
}

/**
 * Applies a slot patch. When weekday/time change, closes the previous pattern
 * at changeDateKey and starts the new pattern from that date (inclusive).
 */
export function applyScheduleSlotUpdate(
  existing: WeeklyScheduleSlot,
  patch: Partial<WeeklyScheduleSlot>,
  changeDateKey: string = getMoscowDateKey(),
): WeeklyScheduleSlot {
  const mergedStudentIds = patch.studentIds
    ? [...patch.studentIds]
    : [...existing.studentIds];

  const base: WeeklyScheduleSlot = {
    ...existing,
    ...patch,
    studentIds: mergedStudentIds,
    studentJoinedAt: patch.studentJoinedAt
      ? { ...patch.studentJoinedAt }
      : existing.studentJoinedAt
        ? { ...existing.studentJoinedAt }
        : undefined,
    patternHistory: existing.patternHistory
      ? existing.patternHistory.map((period) => ({
          ...period,
          studentIds: [...period.studentIds],
          studentJoinedAt: period.studentJoinedAt
            ? { ...period.studentJoinedAt }
            : undefined,
        }))
      : undefined,
  };

  if (!isSchedulePatternChange(existing, patch)) {
    return base;
  }

  const closedPeriod = buildCurrentPatternPeriod(existing, changeDateKey);
  const history = [...(existing.patternHistory ?? []), closedPeriod];

  return {
    ...base,
    effectiveFrom: changeDateKey,
    patternHistory: history,
  };
}
