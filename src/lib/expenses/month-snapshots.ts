import { formatCrmMoscowDateKey } from '@/lib/crm-datetime';
import { expenseMonthKey } from '@/lib/expenses/calculations';
import type { Expense } from '@/lib/expenses/types';

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type ExpenseMonthStudentSnapshot = {
  monthKey: string;
  studentCount: number;
  finalized: boolean;
};

export type ExpenseMonthSnapshotAction =
  | {
      kind: 'upsert-live';
      monthKey: string;
      studentCount: number;
    }
  | {
      kind: 'finalize';
      monthKey: string;
      studentCount: number;
    }
  | {
      kind: 'insert-finalized';
      monthKey: string;
      studentCount: number;
    };

export function isExpenseMonthKey(value: string): boolean {
  return MONTH_KEY_RE.test(value);
}

/** Текущий месяц CRM в Europe/Moscow как YYYY-MM. */
export function getCurrentExpenseMonthKey(now: Date = new Date()): string {
  return formatCrmMoscowDateKey(now).slice(0, 7);
}

export function collectExpenseMonthKeys(expenses: Expense[]): string[] {
  const keys = new Set<string>();
  for (const expense of expenses) {
    const key = expenseMonthKey(expense);
    if (key && isExpenseMonthKey(key)) {
      keys.add(key);
    }
  }
  return [...keys].sort((a, b) => b.localeCompare(a));
}

/**
 * Планирует обновления snapshots и итоговые знаменатели по месяцам.
 *
 * - текущий месяц → всегда live currentStudentCount (row finalized=false);
 * - прошлый с finalized → не трогать;
 * - прошлый без finalized, но с live-row → зафиксировать последнее значение;
 * - прошлый без row → bootstrap текущим count и сразу finalize.
 */
export function planExpenseMonthSnapshotUpdates(options: {
  monthKeys: string[];
  currentMonthKey: string;
  currentStudentCount: number;
  existing: ExpenseMonthStudentSnapshot[];
}): {
  actions: ExpenseMonthSnapshotAction[];
  countsByMonth: Record<string, number>;
} {
  const currentStudentCount = Math.max(0, Math.floor(options.currentStudentCount));
  const currentMonthKey = options.currentMonthKey;
  const existingByKey = new Map(
    options.existing.map((item) => [item.monthKey, item] as const),
  );

  const monthKeys = new Set<string>();
  for (const key of options.monthKeys) {
    if (isExpenseMonthKey(key)) monthKeys.add(key);
  }
  // Закрыть live-снимки прошлых месяцев даже без расходов в выборке.
  for (const item of options.existing) {
    if (
      isExpenseMonthKey(item.monthKey) &&
      !item.finalized &&
      item.monthKey < currentMonthKey
    ) {
      monthKeys.add(item.monthKey);
    }
  }
  // Всегда ведём live-снимок текущего месяца.
  if (isExpenseMonthKey(currentMonthKey)) {
    monthKeys.add(currentMonthKey);
  }

  const actions: ExpenseMonthSnapshotAction[] = [];
  const countsByMonth: Record<string, number> = {};
  const sortedKeys = [...monthKeys].sort((a, b) => a.localeCompare(b));

  for (const monthKey of sortedKeys) {
    const existing = existingByKey.get(monthKey);

    if (monthKey >= currentMonthKey) {
      countsByMonth[monthKey] = currentStudentCount;
      if (
        !existing ||
        existing.finalized ||
        existing.studentCount !== currentStudentCount
      ) {
        actions.push({
          kind: 'upsert-live',
          monthKey,
          studentCount: currentStudentCount,
        });
      }
      continue;
    }

    if (existing?.finalized) {
      countsByMonth[monthKey] = existing.studentCount;
      continue;
    }

    if (existing && !existing.finalized) {
      countsByMonth[monthKey] = existing.studentCount;
      actions.push({
        kind: 'finalize',
        monthKey,
        studentCount: existing.studentCount,
      });
      continue;
    }

    countsByMonth[monthKey] = currentStudentCount;
    actions.push({
      kind: 'insert-finalized',
      monthKey,
      studentCount: currentStudentCount,
    });
  }

  return { actions, countsByMonth };
}

export function resolveMonthStudentCount(options: {
  monthKey: string;
  currentMonthKey: string;
  currentStudentCount: number;
  monthStudentCounts: Record<string, number>;
}): number {
  if (!isExpenseMonthKey(options.monthKey)) {
    return Math.max(0, options.currentStudentCount);
  }

  if (options.monthKey >= options.currentMonthKey) {
    return Math.max(0, options.currentStudentCount);
  }

  const snapshot = options.monthStudentCounts[options.monthKey];
  if (typeof snapshot === 'number' && Number.isFinite(snapshot)) {
    return Math.max(0, snapshot);
  }

  return Math.max(0, options.currentStudentCount);
}
