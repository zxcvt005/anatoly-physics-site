import type { RevenueMonthSnapshot } from '@/types/tutor';

export interface RevenueSnapshotRow {
  id: string;
  month_key: string;
  potential_income: number;
  received_income: number;
  frozen_at: string;
  created_at: string;
  updated_at: string;
}

export type RevenueSnapshotsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type RevenueSnapshotsList = RevenueMonthSnapshot[];
