import type { StudentActivityStatus, StudentPauseInterval } from '@/types/tutor';

/** Half-open interval [from, to): to === null means still paused. */
export function isDateInStudentPause(
  dateKey: string,
  intervals: StudentPauseInterval[] | undefined,
): boolean {
  if (!intervals?.length) return false;

  for (const interval of intervals) {
    if (dateKey < interval.from) continue;
    if (interval.to == null || dateKey < interval.to) {
      return true;
    }
  }

  return false;
}

export function normalizePauseIntervals(
  intervals: StudentPauseInterval[] | undefined | null,
): StudentPauseInterval[] {
  if (!intervals?.length) return [];

  return intervals
    .filter(
      (interval) =>
        typeof interval?.from === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(interval.from) &&
        (interval.to == null ||
          (typeof interval.to === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(interval.to))),
    )
    .map((interval) => ({
      from: interval.from,
      to: interval.to ?? null,
    }));
}

/**
 * Records pause history when activity status changes.
 * Resume day is stored as exclusive `to`, so lessons on the resume day stay markable.
 */
export function applyActivityStatusTransition(
  intervals: StudentPauseInterval[] | undefined,
  previousStatus: StudentActivityStatus | undefined,
  nextStatus: StudentActivityStatus | undefined,
  todayDateKey: string,
): StudentPauseInterval[] {
  const previous = previousStatus ?? 'active';
  const next = nextStatus ?? 'active';
  const current = normalizePauseIntervals(intervals);

  if (previous !== 'paused' && next === 'paused') {
    const hasOpen = current.some((interval) => interval.to == null);
    if (!hasOpen) {
      current.push({ from: todayDateKey, to: null });
    }
    return current;
  }

  if (previous === 'paused' && next !== 'paused') {
    return current.map((interval) =>
      interval.to == null ? { ...interval, to: todayDateKey } : interval,
    );
  }

  return current;
}
