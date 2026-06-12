import type { RevenueMonthSnapshot } from '@/types/tutor';

export const REVENUE_SNAPSHOTS_STORAGE_KEY = 'tutor-revenue-snapshots-mock-v1';

export function readRevenueSnapshotsFromLocalStorage(
  fallback: RevenueMonthSnapshot[],
): RevenueMonthSnapshot[] {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const stored = window.localStorage.getItem(REVENUE_SNAPSHOTS_STORAGE_KEY);

  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as RevenueMonthSnapshot[];
  } catch {
    return fallback;
  }
}

export function writeRevenueSnapshotsToLocalStorage(
  snapshots: RevenueMonthSnapshot[],
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    REVENUE_SNAPSHOTS_STORAGE_KEY,
    JSON.stringify(snapshots),
  );
}
