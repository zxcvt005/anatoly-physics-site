import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { runInstrumentedApiRoute } from '@/lib/crm/api/route-diagnostics.server';
import type { ExpenseInput } from '@/lib/expenses/types';
import {
  fetchExpensesBundleFromSupabase,
  insertExpenseToSupabase,
} from '@/lib/supabase/expenses/repository';

export async function GET(request: Request) {
  return runInstrumentedApiRoute(request, 'GET /api/crm/expenses', async () => {
    const notConfigured = assertSupabaseConfiguredOnServer();
    if (notConfigured) return notConfigured;

    return crmApiJson(await fetchExpensesBundleFromSupabase(), 200, {
      operation: 'GET /api/crm/expenses',
      requestUrl: request.url,
    });
  });
}

export async function POST(request: Request) {
  return runInstrumentedApiRoute(request, 'POST /api/crm/expenses', async () => {
    const notConfigured = assertSupabaseConfiguredOnServer();
    if (notConfigured) return notConfigured;

    const body = (await request.json()) as { expense?: ExpenseInput };
    if (!body.expense) {
      return crmApiJson(
        { ok: false, error: 'Missing expense' },
        200,
        {
          operation: 'POST /api/crm/expenses',
          requestUrl: request.url,
        },
      );
    }

    return crmApiJson(await insertExpenseToSupabase(body.expense), 201, {
      operation: 'POST /api/crm/expenses',
      requestUrl: request.url,
    });
  });
}
