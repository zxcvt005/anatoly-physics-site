import 'server-only';

import { startCrmOperationTimer } from '@/lib/crm/diagnostics/log-failure.server';
import { normalizeExpenseStats } from '@/lib/expenses/calculations';
import type {
  Expense,
  ExpenseInput,
  ExpensesBundle,
  ExpenseStats,
  ExpenseWriteResult,
  NormalizedExpenseInput,
} from '@/lib/expenses/types';
import { generateExpenseId, validateExpenseInput } from '@/lib/expenses/validation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import {
  expenseToInsertRow,
  mapExpenseRow,
  mapExpenseRows,
} from '@/lib/supabase/expenses/mappers';
import type {
  ExpenseRow,
  ExpensesRepositoryResult,
} from '@/lib/supabase/expenses/types';
import {
  logRepositoryFailure,
  logSupabaseQueryFailure,
} from '@/lib/supabase/log-query-failure.server';

const EXPENSE_SELECT = `
  id,
  app_id,
  type,
  student_id,
  employee_name,
  amount,
  expense_date,
  period_start,
  period_end,
  description,
  created_at,
  updated_at,
  students (
    app_id
  )
`;

function getClient() {
  return createSupabaseAdminClient();
}

async function resolveStudentUuid(
  studentAppId: string,
): Promise<ExpensesRepositoryResult<string>> {
  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('app_id', studentAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data?.id) {
    return { ok: false, error: 'Ученик не найден' };
  }

  return { ok: true, data: data.id as string };
}

async function fetchExpenseStats(): Promise<ExpensesRepositoryResult<ExpenseStats>> {
  const client = getClient();
  const { data, error } = await client.rpc('expense_summary');

  if (error) {
    return { ok: false, error: error.message };
  }

  const stats = normalizeExpenseStats(data);
  if (!stats) {
    return { ok: false, error: 'Не удалось прочитать сводку расходов' };
  }

  return { ok: true, data: stats };
}

async function fetchExpenseByAppId(
  expenseAppId: string,
): Promise<ExpensesRepositoryResult<Expense>> {
  const client = getClient();
  const { data, error } = await client
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('app_id', expenseAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'Расход не найден' };
  }

  const expense = mapExpenseRow(data as ExpenseRow);
  if (!expense) {
    return { ok: false, error: 'Расход не найден' };
  }

  return { ok: true, data: expense };
}

async function withStats(
  expense: Expense | null,
): Promise<ExpensesRepositoryResult<ExpenseWriteResult>> {
  const stats = await fetchExpenseStats();
  if (!stats.ok) return stats;
  return { ok: true, data: { expense, stats: stats.data } };
}

async function resolveWriteRow(input: NormalizedExpenseInput): Promise<
  ExpensesRepositoryResult<{
    studentUuid: string | null;
    normalized: NormalizedExpenseInput;
  }>
> {
  if (!input.studentId) {
    return { ok: true, data: { studentUuid: null, normalized: input } };
  }

  const student = await resolveStudentUuid(input.studentId);
  if (!student.ok) return student;

  return {
    ok: true,
    data: { studentUuid: student.data, normalized: input },
  };
}

export async function fetchExpensesBundleFromSupabase(): Promise<
  ExpensesRepositoryResult<ExpensesBundle>
> {
  const operation = 'fetchExpensesBundleFromSupabase';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const [expensesResult, statsResult] = await Promise.all([
    client.from('expenses').select(EXPENSE_SELECT),
    client.rpc('expense_summary'),
  ]);

  if (expensesResult.error) {
    logSupabaseQueryFailure(
      `${operation}.select`,
      expensesResult.error,
      startedAt,
    );
    return { ok: false, error: expensesResult.error.message };
  }

  if (statsResult.error) {
    logSupabaseQueryFailure(`${operation}.summary`, statsResult.error, startedAt);
    return { ok: false, error: statsResult.error.message };
  }

  const stats = normalizeExpenseStats(statsResult.data);
  if (!stats) {
    logRepositoryFailure(operation, 'Invalid expense summary', startedAt);
    return { ok: false, error: 'Не удалось прочитать сводку расходов' };
  }

  return {
    ok: true,
    data: {
      expenses: mapExpenseRows(expensesResult.data as ExpenseRow[] | null),
      stats,
    },
  };
}

export async function insertExpenseToSupabase(
  input: ExpenseInput,
): Promise<ExpensesRepositoryResult<ExpenseWriteResult>> {
  const operation = 'insertExpenseToSupabase';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return { ok: false, error: 'Supabase is not configured' };
  }

  const validated = validateExpenseInput(input);
  if (!validated.ok) return validated;

  const resolved = await resolveWriteRow(validated.value);
  if (!resolved.ok) return resolved;

  const client = getClient();
  const { data, error } = await client
    .from('expenses')
    .insert(
      expenseToInsertRow(generateExpenseId(), {
        ...resolved.data.normalized,
        studentUuid: resolved.data.studentUuid,
      }),
    )
    .select(EXPENSE_SELECT)
    .single();

  if (error) {
    logSupabaseQueryFailure(operation, error, startedAt);
    return { ok: false, error: error.message };
  }

  const expense = mapExpenseRow(data as ExpenseRow);
  if (!expense) {
    return { ok: false, error: 'Не удалось сохранить расход' };
  }

  if (!expense.employeeName && resolved.data.normalized.employeeName) {
    expense.employeeName = resolved.data.normalized.employeeName;
  }

  if (!expense.studentId && resolved.data.normalized.studentId) {
    expense.studentId = resolved.data.normalized.studentId;
  }

  return withStats(expense);
}

export async function updateExpenseInSupabase(
  expenseAppId: string,
  input: ExpenseInput,
): Promise<ExpensesRepositoryResult<ExpenseWriteResult>> {
  const operation = 'updateExpenseInSupabase';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return { ok: false, error: 'Supabase is not configured' };
  }

  if (!expenseAppId.trim()) {
    return { ok: false, error: 'Расход не найден' };
  }

  const validated = validateExpenseInput(input);
  if (!validated.ok) return validated;

  const resolved = await resolveWriteRow(validated.value);
  if (!resolved.ok) return resolved;

  const client = getClient();
  const { data, error } = await client
    .from('expenses')
    .update(
      expenseToInsertRow(expenseAppId, {
        ...resolved.data.normalized,
        studentUuid: resolved.data.studentUuid,
      }),
    )
    .eq('app_id', expenseAppId)
    .select(EXPENSE_SELECT)
    .maybeSingle();

  if (error) {
    logSupabaseQueryFailure(operation, error, startedAt);
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'Расход не найден' };
  }

  const expense = mapExpenseRow(data as ExpenseRow);
  if (!expense) {
    return { ok: false, error: 'Не удалось сохранить расход' };
  }

  if (!expense.employeeName && resolved.data.normalized.employeeName) {
    expense.employeeName = resolved.data.normalized.employeeName;
  }

  if (!expense.studentId && resolved.data.normalized.studentId) {
    expense.studentId = resolved.data.normalized.studentId;
  }

  return withStats(expense);
}

export async function deleteExpenseFromSupabase(
  expenseAppId: string,
): Promise<ExpensesRepositoryResult<ExpenseWriteResult>> {
  const operation = 'deleteExpenseFromSupabase';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return { ok: false, error: 'Supabase is not configured' };
  }

  const existing = await fetchExpenseByAppId(expenseAppId);
  if (!existing.ok) return existing;

  const client = getClient();
  const { error } = await client
    .from('expenses')
    .delete()
    .eq('app_id', expenseAppId);

  if (error) {
    logSupabaseQueryFailure(operation, error, startedAt);
    return { ok: false, error: error.message };
  }

  return withStats(null);
}
