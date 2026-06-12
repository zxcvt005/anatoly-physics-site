import type { RevenueMonthSnapshot } from '@/types/tutor';
import type { RevenueSnapshotsRepositoryResult } from '@/lib/supabase/revenue-snapshots/types';
import { crmApiDelete, crmApiGet, crmApiPost, crmApiPut } from './http';

const BASE = '/api/crm/revenue-snapshots';

export async function fetchRevenueSnapshotsFromSupabase(): Promise<
  RevenueSnapshotsRepositoryResult<RevenueMonthSnapshot[]>
> {
  return crmApiGet<RevenueMonthSnapshot[]>(BASE);
}

export async function upsertRevenueSnapshotInSupabase(
  snapshot: RevenueMonthSnapshot,
): Promise<RevenueSnapshotsRepositoryResult<RevenueMonthSnapshot>> {
  return crmApiPost<RevenueMonthSnapshot>(BASE, { snapshot });
}

export async function upsertRevenueSnapshotsInSupabase(
  snapshots: RevenueMonthSnapshot[],
): Promise<RevenueSnapshotsRepositoryResult<RevenueMonthSnapshot[]>> {
  return crmApiPut<RevenueMonthSnapshot[]>(BASE, { snapshots });
}

export async function deleteRevenueSnapshotFromSupabase(
  monthKey: string,
): Promise<RevenueSnapshotsRepositoryResult<null>> {
  return crmApiDelete<null>(`${BASE}/${encodeURIComponent(monthKey)}`);
}

export async function seedRevenueSnapshotsToSupabase(
  snapshots: RevenueMonthSnapshot[],
): Promise<RevenueSnapshotsRepositoryResult<RevenueMonthSnapshot[]>> {
  return crmApiPost<RevenueMonthSnapshot[]>(`${BASE}/seed`, snapshots);
}
