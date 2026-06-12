import type { RevenueMonthSnapshot } from '@/types/tutor';
import type { RevenueSnapshotRow } from './types';

export function snapshotRowToRevenueMonthSnapshot(
  row: RevenueSnapshotRow,
): RevenueMonthSnapshot {
  return {
    monthKey: row.month_key,
    potentialIncome: row.potential_income,
    receivedIncome: row.received_income,
    frozenAt: row.frozen_at,
  };
}

export function mapRevenueSnapshotRows(
  rows: RevenueSnapshotRow[] | null,
): RevenueMonthSnapshot[] {
  return (rows ?? []).map(snapshotRowToRevenueMonthSnapshot);
}

export function snapshotToUpsertRow(snapshot: RevenueMonthSnapshot) {
  return {
    month_key: snapshot.monthKey,
    potential_income: snapshot.potentialIncome,
    received_income: snapshot.receivedIncome,
    frozen_at: snapshot.frozenAt,
  };
}
