import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { deleteRevenueSnapshotFromSupabase } from '@/lib/supabase/revenue-snapshots/repository';

interface RouteContext {
  params: Promise<{ monthKey: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { monthKey } = await context.params;
  return crmApiJson(await deleteRevenueSnapshotFromSupabase(monthKey));
}
