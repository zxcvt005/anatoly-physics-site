import type { ExpenseType } from '@/lib/expenses/types';

export type ExpenseRow = {
  id: string;
  app_id: string;
  type: string;
  student_id: string | null;
  employee_name: string | null;
  amount: number;
  expense_date: string | null;
  period_start: string | null;
  period_end: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  students: { app_id: string } | { app_id: string }[] | null;
};

export type ExpenseInsertRow = {
  app_id: string;
  type: ExpenseType;
  student_id: string | null;
  employee_name: string | null;
  amount: number;
  expense_date: string | null;
  period_start: string | null;
  period_end: string | null;
  description: string | null;
};

export type ExpensesRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
