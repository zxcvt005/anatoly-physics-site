import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import type { ExpenseInput } from '@/lib/expenses/types';
import {
  deleteExpenseFromSupabase,
  updateExpenseInSupabase,
} from '@/lib/supabase/expenses/repository';

type RouteContext = {
  params: Promise<{ expenseId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { expenseId } = await context.params;
  const body = (await request.json()) as { expense?: ExpenseInput };
  if (!body.expense) {
    return crmApiJson({ ok: false, error: 'Missing expense' });
  }

  return crmApiJson(await updateExpenseInSupabase(expenseId, body.expense));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { expenseId } = await context.params;
  return crmApiJson(await deleteExpenseFromSupabase(expenseId));
}
