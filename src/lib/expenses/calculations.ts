import { EXPENSE_TYPE_DEFINITIONS, getExpenseTypeDefinition, getExpenseTypePluralLabel } from '@/lib/expenses/definitions';
import { formatMonthKeyLabel } from '@/lib/revenue-calculations';
import type { Expense, ExpenseGiftCount, ExpenseStats } from '@/lib/expenses/types';

export type ExpenseTypeTotal = {
  type: string;
  pluralLabel: string;
  total: number;
};

export type ExpenseMonthGroup = {
  monthKey: string;
  label: string;
  total: number;
  byType: ExpenseTypeTotal[];
  expenses: Expense[];
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatExpenseDayMonth(dateKey: string | null | undefined): string {
  if (!dateKey) return '—';
  const match = DATE_RE.exec(dateKey);
  if (!match) return '—';
  return `${match[3]}.${match[2]}`;
}

export function formatExpensePeriod(
  periodStart: string | null,
  periodEnd: string | null,
): string {
  if (!periodStart || !periodEnd) return '—';
  return `${formatExpenseDayMonth(periodStart)}–${formatExpenseDayMonth(periodEnd)}`;
}

/** Месяц: дата расхода; для «Профи» и будущих типов с периодом — дата начала периода. */
export function expenseGroupingDate(
  expense: Pick<Expense, 'type' | 'expenseDate' | 'periodStart'>,
): string | null {
  const definition = getExpenseTypeDefinition(expense.type);
  if (definition?.usesPeriod) {
    return expense.periodStart;
  }
  if (definition) {
    return expense.expenseDate;
  }
  return expense.expenseDate ?? expense.periodStart;
}

export function expenseMonthKey(expense: Expense): string | null {
  const date = expenseGroupingDate(expense);
  if (!date || date.length < 7) return null;
  return date.slice(0, 7);
}

export function computeAverageExpensePerStudent(
  total: number,
  studentCount: number,
): number {
  if (!Number.isFinite(total) || !Number.isFinite(studentCount) || studentCount <= 0) {
    return 0;
  }
  return Math.round(total / studentCount);
}

export function buildTypeTotals(
  amountsByType: Record<string, number>,
): ExpenseTypeTotal[] {
  const known = new Set<string>(EXPENSE_TYPE_DEFINITIONS.map((item) => item.type));
  const totals: ExpenseTypeTotal[] = EXPENSE_TYPE_DEFINITIONS.map((definition) => ({
    type: definition.type,
    pluralLabel: definition.pluralLabel,
    total: amountsByType[definition.type] ?? 0,
  }));

  const extras = Object.keys(amountsByType)
    .filter((type) => !known.has(type) && (amountsByType[type] ?? 0) !== 0)
    .sort((a, b) => a.localeCompare(b));

  for (const type of extras) {
    totals.push({
      type,
      pluralLabel: getExpenseTypePluralLabel(type),
      total: amountsByType[type] ?? 0,
    });
  }

  return totals;
}

export function filterExpensesByType(
  expenses: Expense[],
  typeFilter: string,
): Expense[] {
  if (!typeFilter || typeFilter === 'all') return expenses;
  return expenses.filter((expense) => expense.type === typeFilter);
}

export function summarizeExpenses(expenses: Expense[]): {
  total: number;
  byType: ExpenseTypeTotal[];
} {
  const amountsByType: Record<string, number> = {};
  let total = 0;

  for (const expense of expenses) {
    amountsByType[expense.type] = (amountsByType[expense.type] ?? 0) + expense.amount;
    total += expense.amount;
  }

  return { total, byType: buildTypeTotals(amountsByType) };
}

function compareExpensesNewestFirst(a: Expense, b: Expense): number {
  const dateA = expenseGroupingDate(a) ?? '';
  const dateB = expenseGroupingDate(b) ?? '';
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  return b.createdAt.localeCompare(a.createdAt);
}

export function buildExpenseMonthGroups(expenses: Expense[]): ExpenseMonthGroup[] {
  const byMonth = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const monthKey = expenseMonthKey(expense) ?? 'unknown';
    const list = byMonth.get(monthKey) ?? [];
    list.push(expense);
    byMonth.set(monthKey, list);
  }

  return [...byMonth.entries()]
    .sort(([monthA], [monthB]) => {
      if (monthA === 'unknown') return 1;
      if (monthB === 'unknown') return -1;
      return monthB.localeCompare(monthA);
    })
    .map(([monthKey, monthExpenses]) => {
      const sorted = [...monthExpenses].sort(compareExpensesNewestFirst);
      const summary = summarizeExpenses(sorted);

      return {
        monthKey,
        label: monthKey === 'unknown' ? 'Без даты' : formatMonthKeyLabel(monthKey),
        total: summary.total,
        byType: summary.byType,
        expenses: sorted,
      };
    });
}

export function buildGiftCounts(expenses: Expense[]): ExpenseGiftCount[] {
  const counts = new Map<string, number>();

  for (const expense of expenses) {
    if (expense.type !== 'gift' || !expense.studentId) continue;
    counts.set(expense.studentId, (counts.get(expense.studentId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([studentId, count]) => ({
      studentId,
      studentName: '',
      count,
    }))
    .sort((a, b) => b.count - a.count || a.studentId.localeCompare(b.studentId));
}

export function normalizeExpenseStats(value: unknown): ExpenseStats | null {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const raw = parsed as Record<string, unknown>;
  const byTypeSource =
    raw.byType && typeof raw.byType === 'object'
      ? (raw.byType as Record<string, unknown>)
      : {};

  const byType: Record<string, number> = {};
  for (const definition of EXPENSE_TYPE_DEFINITIONS) {
    const amount = Number(byTypeSource[definition.type] ?? 0);
    byType[definition.type] = Number.isFinite(amount) ? amount : 0;
  }

  for (const [type, amount] of Object.entries(byTypeSource)) {
    if (type in byType) continue;
    const numeric = Number(amount);
    if (Number.isFinite(numeric)) {
      byType[type] = numeric;
    }
  }

  const total = Object.values(byType).reduce((sum, amount) => sum + amount, 0);

  const studentCount = Number(raw.studentCount ?? 0);
  const safeStudentCount = Number.isFinite(studentCount) ? Math.max(0, studentCount) : 0;
  const gifts = parseGiftCounts(raw.gifts);

  return {
    byType,
    total,
    studentCount: safeStudentCount,
    averagePerStudent: computeAverageExpensePerStudent(total, safeStudentCount),
    gifts,
  };
}

function parseGiftCounts(value: unknown): ExpenseGiftCount[] {
  if (!Array.isArray(value)) return [];

  const gifts: ExpenseGiftCount[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const studentId = typeof row.studentId === 'string' ? row.studentId : '';
    const studentName = typeof row.studentName === 'string' ? row.studentName : '';
    const count = Number(row.count);
    if (!studentId || !Number.isFinite(count) || count <= 0) continue;
    gifts.push({ studentId, studentName, count });
  }

  return gifts.sort(
    (a, b) => b.count - a.count || a.studentName.localeCompare(b.studentName, 'ru'),
  );
}

export function emptyExpenseStats(): ExpenseStats {
  return {
    byType: Object.fromEntries(
      EXPENSE_TYPE_DEFINITIONS.map((definition) => [definition.type, 0]),
    ),
    total: 0,
    studentCount: 0,
    averagePerStudent: 0,
    gifts: [],
  };
}
