import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { seedPaymentsToSupabase } from '@/lib/supabase/payments/repository';
import type { Payment } from '@/types/tutor';

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { payments?: Payment[] };
  return crmApiJson(
    await seedPaymentsToSupabase(body.payments ?? []),
    201,
  );
}
