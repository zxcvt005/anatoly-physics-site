import type {
  ExpenseInput,
  ExpensesBundle,
  ExpenseWriteResult,
} from '@/lib/expenses/types';
import { crmApiDelete, crmApiGet, crmApiPatch, crmApiPost } from '@/lib/crm/api/http';

const BASE = '/api/crm/expenses';

export async function fetchExpensesBundleFromApi() {
  return crmApiGet<ExpensesBundle>(BASE);
}

export async function createExpenseInApi(expense: ExpenseInput) {
  return crmApiPost<ExpenseWriteResult>(BASE, { expense });
}

export async function updateExpenseInApi(expenseId: string, expense: ExpenseInput) {
  return crmApiPatch<ExpenseWriteResult>(
    `${BASE}/${encodeURIComponent(expenseId)}`,
    { expense },
  );
}

export async function deleteExpenseInApi(expenseId: string) {
  return crmApiDelete<ExpenseWriteResult>(
    `${BASE}/${encodeURIComponent(expenseId)}`,
  );
}
