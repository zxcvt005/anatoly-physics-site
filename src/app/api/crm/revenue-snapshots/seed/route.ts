import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { seedRevenueSnapshotsToSupabase } from '@/lib/supabase/revenue-snapshots/repository';
import type { RevenueMonthSnapshot } from '@/types/tutor';

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as RevenueMonthSnapshot[];
  return crmApiJson(await seedRevenueSnapshotsToSupabase(body ?? []), 201);
}
