import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { runInstrumentedApiRoute } from '@/lib/crm/api/route-diagnostics.server';
import {
  fetchPaymentsFromSupabase,
  insertPaymentToSupabase,
} from '@/lib/supabase/payments/repository';
import type { Payment } from '@/types/tutor';

export async function GET(request: Request) {
  return runInstrumentedApiRoute(request, 'GET /api/crm/payments', async () => {
    const notConfigured = assertSupabaseConfiguredOnServer();
    if (notConfigured) {
      return notConfigured;
    }

    return crmApiJson(await fetchPaymentsFromSupabase(), 200, {
      operation: 'GET /api/crm/payments',
      requestUrl: request.url,
    });
  });
}

export async function POST(request: Request) {
  return runInstrumentedApiRoute(request, 'POST /api/crm/payments', async () => {
    const notConfigured = assertSupabaseConfiguredOnServer();
    if (notConfigured) {
      return notConfigured;
    }

    const body = (await request.json()) as { payment?: Payment };
    if (!body.payment) {
      return crmApiJson(
        { ok: false, error: 'Missing payment' },
        200,
        {
          operation: 'POST /api/crm/payments',
          requestUrl: request.url,
        },
      );
    }

    return crmApiJson(await insertPaymentToSupabase(body.payment), 201, {
      operation: 'POST /api/crm/payments',
      requestUrl: request.url,
    });
  });
}
