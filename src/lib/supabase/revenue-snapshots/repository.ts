import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import type { RevenueMonthSnapshot } from '@/types/tutor';
import {
  mapRevenueSnapshotRows,
  snapshotRowToRevenueMonthSnapshot,
  snapshotToUpsertRow,
} from './mappers';
import type {
  RevenueSnapshotRow,
  RevenueSnapshotsList,
  RevenueSnapshotsRepositoryResult,
} from './types';

function getClient() {
  return createSupabaseAdminClient();
}

export async function fetchRevenueSnapshotsFromSupabase(): Promise<
  RevenueSnapshotsRepositoryResult<RevenueSnapshotsList>
> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('revenue_month_snapshots')
    .select('*')
    .order('month_key', { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: mapRevenueSnapshotRows(data as RevenueSnapshotRow[] | null),
  };
}

export async function upsertRevenueSnapshotInSupabase(
  snapshot: RevenueMonthSnapshot,
): Promise<RevenueSnapshotsRepositoryResult<RevenueMonthSnapshot>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('revenue_month_snapshots')
    .upsert(snapshotToUpsertRow(snapshot), { onConflict: 'month_key' })
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: snapshotRowToRevenueMonthSnapshot(data as RevenueSnapshotRow),
  };
}

export async function upsertRevenueSnapshotsInSupabase(
  snapshots: RevenueMonthSnapshot[],
): Promise<RevenueSnapshotsRepositoryResult<RevenueSnapshotsList>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  if (snapshots.length === 0) {
    return fetchRevenueSnapshotsFromSupabase();
  }

  for (const snapshot of snapshots) {
    const result = await upsertRevenueSnapshotInSupabase(snapshot);

    if (!result.ok) {
      return result;
    }
  }

  return fetchRevenueSnapshotsFromSupabase();
}

export async function deleteRevenueSnapshotFromSupabase(
  monthKey: string,
): Promise<RevenueSnapshotsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { error } = await client
    .from('revenue_month_snapshots')
    .delete()
    .eq('month_key', monthKey);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: null };
}

export async function seedRevenueSnapshotsToSupabase(
  snapshots: RevenueMonthSnapshot[],
): Promise<RevenueSnapshotsRepositoryResult<RevenueSnapshotsList>> {
  return upsertRevenueSnapshotsInSupabase(snapshots);
}
