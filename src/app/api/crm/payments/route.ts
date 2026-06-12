import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchPaymentsFromSupabase,
  insertPaymentToSupabase,
} from '@/lib/supabase/payments/repository';
import type { Payment } from '@/types/tutor';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  return crmApiJson(await fetchPaymentsFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { payment?: Payment };
  if (!body.payment) {
    return crmApiJson({ ok: false, error: 'Missing payment' });
  }

  return crmApiJson(await insertPaymentToSupabase(body.payment), 201);
}
