import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchRevenueSnapshotsFromSupabase,
  upsertRevenueSnapshotInSupabase,
  upsertRevenueSnapshotsInSupabase,
} from '@/lib/supabase/revenue-snapshots/repository';
import type { RevenueMonthSnapshot } from '@/types/tutor';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  return crmApiJson(await fetchRevenueSnapshotsFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { snapshot?: RevenueMonthSnapshot };

  if (!body.snapshot) {
    return crmApiJson({ ok: false, error: 'Missing snapshot' });
  }

  return crmApiJson(await upsertRevenueSnapshotInSupabase(body.snapshot), 201);
}

export async function PUT(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as {
    snapshot?: RevenueMonthSnapshot;
    snapshots?: RevenueMonthSnapshot[];
  };

  if (body.snapshots) {
    return crmApiJson(
      await upsertRevenueSnapshotsInSupabase(body.snapshots),
    );
  }

  if (body.snapshot) {
    const result = await upsertRevenueSnapshotInSupabase(body.snapshot);

    if (!result.ok) {
      return crmApiJson(result);
    }

    return crmApiJson({ ok: true, data: [result.data] });
  }

  return crmApiJson({ ok: false, error: 'Missing snapshot or snapshots' });
}
