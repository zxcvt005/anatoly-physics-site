import { getExpenseTypeDefinition } from '@/lib/expenses/definitions';
import type { Expense, ExpenseType } from '@/lib/expenses/types';
import type { ExpenseInsertRow, ExpenseRow } from '@/lib/supabase/expenses/types';

function nestedAppId(
  value: { app_id: string } | { app_id: string }[] | null | undefined,
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.app_id ?? null;
  return value.app_id;
}

export function mapExpenseRow(row: ExpenseRow): Expense | null {
  const type = row.type?.trim();
  if (!type) return null;

  const definition = getExpenseTypeDefinition(type);
  const linkedStudentId = nestedAppId(row.students) ?? null;
  const employeeName = row.employee_name?.trim() || null;

  return {
    id: row.app_id,
    type,
    studentId: definition
      ? definition.requiresStudent
        ? linkedStudentId
        : null
      : linkedStudentId,
    employeeName: definition
      ? definition.requiresEmployee
        ? employeeName
        : null
      : employeeName,
    amount: row.amount,
    expenseDate: row.expense_date,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExpenseRows(rows: ExpenseRow[] | null): Expense[] {
  return (rows ?? [])
    .map(mapExpenseRow)
    .filter((row): row is Expense => row !== null);
}

export function expenseToInsertRow(
  appId: string,
  expense: {
    type: ExpenseType;
    studentUuid: string | null;
    employeeName: string | null;
    amount: number;
    expenseDate: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    description: string | null;
  },
): ExpenseInsertRow {
  return {
    app_id: appId,
    type: expense.type,
    student_id: expense.studentUuid,
    employee_name: expense.employeeName,
    amount: expense.amount,
    expense_date: expense.expenseDate,
    period_start: expense.periodStart,
    period_end: expense.periodEnd,
    description: expense.description,
  };
}
