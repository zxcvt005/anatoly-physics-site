import assert from 'node:assert/strict';
import { isAssistantAllowedCrmApiRequest } from '../src/lib/auth/crm-access/request-access';
import {
  buildExpenseMonthGroups,
  buildGiftCounts,
  computeAverageExpensePerStudent,
  expenseMonthKey,
  filterExpensesByType,
  formatExpensePeriod,
  normalizeExpenseStats,
  summarizeExpenses,
} from '../src/lib/expenses/calculations';
import type { Expense, ExpenseType } from '../src/lib/expenses/types';
import {
  generateExpenseId,
  validateExpenseInput,
} from '../src/lib/expenses/validation';
import { STUDENT_HARD_DELETE_CASCADE_STEPS } from '../src/lib/supabase/students/delete-student-policy';

const errors: string[] = [];
let passed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expense(
  overrides: Partial<Expense> & Pick<Expense, 'type' | 'amount'>,
): Expense {
  const type = overrides.type;
  const isPro = type === 'pro';
  const isSalary = type === 'salary';
  return {
    id: overrides.id ?? generateExpenseId(),
    type,
    studentId: isPro || isSalary ? null : (overrides.studentId ?? 's-ivan'),
    employeeName: isSalary ? (overrides.employeeName ?? 'Дима') : null,
    amount: overrides.amount,
    expenseDate: isPro ? null : (overrides.expenseDate ?? '2026-10-01'),
    periodStart: isPro ? (overrides.periodStart ?? '2026-09-01') : null,
    periodEnd: isPro ? (overrides.periodEnd ?? '2026-09-07') : null,
    description: overrides.description ?? null,
    createdAt: overrides.createdAt ?? '2026-10-01T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-10-01T12:00:00.000Z',
  };
}

test('dated expenses require a student and a date', () => {
  for (const type of ['tablet', 'gift', 'other'] as ExpenseType[]) {
    const missingStudent = validateExpenseInput({
      type,
      amount: 1000,
      expenseDate: '2026-10-01',
      description: type === 'other' ? 'Материалы' : null,
    });
    assert.equal(missingStudent.ok, false);

    const saved = validateExpenseInput({
      type,
      studentId: 's-ivan',
      amount: type === 'tablet' ? 35000 : type === 'gift' ? 3000 : 1500,
      expenseDate: '2026-10-01',
      description: type === 'other' ? 'Дополнительные материалы' : 'ignored',
    });
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.equal(saved.value.studentId, 's-ivan');
    assert.equal(saved.value.periodStart, null);
    assert.equal(saved.value.expenseDate, '2026-10-01');
    if (type === 'other') {
      assert.equal(saved.value.description, 'Дополнительные материалы');
    } else {
      assert.equal(saved.value.description, null);
    }
  }
});

test('other requires a description', () => {
  const result = validateExpenseInput({
    type: 'other',
    studentId: 's-ivan',
    amount: 1500,
    expenseDate: '2026-10-01',
    description: '   ',
  });
  assert.equal(result.ok, false);
});

test('pro is one period record without a student', () => {
  const result = validateExpenseInput({
    type: 'pro',
    studentId: 's-ivan',
    amount: 8500,
    expenseDate: '2026-10-01',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-07',
    description: 'не должно сохраниться',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.studentId, null);
  assert.equal(result.value.expenseDate, null);
  assert.equal(result.value.description, null);
  assert.equal(result.value.periodStart, '2026-09-01');
  assert.equal(result.value.periodEnd, '2026-09-07');
});

test('pro rejects an inverted period and non-positive amount', () => {
  assert.equal(
    validateExpenseInput({
      type: 'pro',
      amount: 8500,
      periodStart: '2026-09-07',
      periodEnd: '2026-09-01',
    }).ok,
    false,
  );
  assert.equal(
    validateExpenseInput({
      type: 'tablet',
      studentId: 's-ivan',
      amount: 0,
      expenseDate: '2026-10-01',
    }).ok,
    false,
  );
  assert.equal(
    validateExpenseInput({
      type: 'gift',
      studentId: 's-ivan',
      amount: 15.5,
      expenseDate: '2026-10-01',
    }).ok,
    false,
  );
});

test('months group pro by period start and dated expenses by expense date', () => {
  const groups = buildExpenseMonthGroups([
    expense({
      id: 'gift-oct',
      type: 'gift',
      amount: 3000,
      expenseDate: '2026-10-01',
      createdAt: '2026-10-01T10:00:00.000Z',
    }),
    expense({
      id: 'tablet-oct-late',
      type: 'tablet',
      amount: 35000,
      expenseDate: '2026-10-03',
      createdAt: '2026-10-03T10:00:00.000Z',
    }),
    expense({
      id: 'pro-sep',
      type: 'pro',
      amount: 8500,
      periodStart: '2026-09-01',
      periodEnd: '2026-09-07',
      createdAt: '2026-10-01T10:00:00.000Z',
    }),
    expense({
      id: 'other-sep',
      type: 'other',
      amount: 1500,
      expenseDate: '2026-09-20',
      description: 'Материалы',
      createdAt: '2026-09-20T10:00:00.000Z',
    }),
  ]);

  assert.deepEqual(
    groups.map((group) => group.monthKey),
    ['2026-10', '2026-09'],
  );
  assert.equal(expenseMonthKey(groups[1]!.expenses.find((item) => item.id === 'pro-sep')!), '2026-09');
  assert.deepEqual(
    groups[0]!.expenses.map((item) => item.id),
    ['tablet-oct-late', 'gift-oct'],
  );
  assert.equal(groups[0]!.total, 38000);
  assert.equal(groups[1]!.total, 10000);
  assert.equal(groups[1]!.byType.find((item) => item.type === 'pro')?.total, 8500);
  assert.equal(groups[1]!.byType.find((item) => item.type === 'other')?.total, 1500);
  assert.equal(groups[1]!.byType.find((item) => item.type === 'gift')?.total, 0);
  assert.equal(formatExpensePeriod('2026-09-01', '2026-09-07'), '01.09–07.09');
});

test('salary is a dated record for an employee, not a student', () => {
  const missingName = validateExpenseInput({
    type: 'salary',
    employeeName: '   ',
    amount: 70000,
    expenseDate: '2026-10-01',
    studentId: 's-ivan',
  });
  assert.equal(missingName.ok, false);

  const saved = validateExpenseInput({
    type: 'salary',
    employeeName: ' Дима ',
    amount: 70000,
    expenseDate: '2026-10-01',
    studentId: 's-ivan',
    periodStart: '2026-10-01',
    description: 'не сохранять',
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.value.employeeName, 'Дима');
  assert.equal(saved.value.studentId, null);
  assert.equal(saved.value.expenseDate, '2026-10-01');
  assert.equal(saved.value.periodStart, null);
  assert.equal(saved.value.periodEnd, null);
  assert.equal(saved.value.description, null);

  const salary = expense({
    id: 'salary-oct',
    type: 'salary',
    employeeName: 'Миша',
    amount: 30000,
    expenseDate: '2026-10-01',
  });
  assert.equal(expenseMonthKey(salary), '2026-10');
  assert.equal(salary.studentId, null);
});

test('month type filters stay independent and salaries stay in totals', () => {
  const groups = buildExpenseMonthGroups([
    expense({
      id: 'gift-oct',
      type: 'gift',
      amount: 8000,
      expenseDate: '2026-10-02',
    }),
    expense({
      id: 'salary-oct',
      type: 'salary',
      employeeName: 'Дима',
      amount: 70000,
      expenseDate: '2026-10-01',
    }),
    expense({
      id: 'salary-oct-2',
      type: 'salary',
      employeeName: 'Миша',
      amount: 30000,
      expenseDate: '2026-10-01',
    }),
    expense({
      id: 'pro-sep',
      type: 'pro',
      amount: 20000,
      periodStart: '2026-09-01',
      periodEnd: '2026-09-07',
    }),
  ]);

  const october = groups.find((group) => group.monthKey === '2026-10');
  const september = groups.find((group) => group.monthKey === '2026-09');
  assert.ok(october);
  assert.ok(september);
  assert.equal(october?.byType.find((item) => item.type === 'salary')?.total, 100000);
  assert.equal(october?.total, 108000);

  const octoberGifts = summarizeExpenses(filterExpensesByType(october!.expenses, 'gift'));
  const octoberSalaries = summarizeExpenses(
    filterExpensesByType(october!.expenses, 'salary'),
  );
  const septemberPro = summarizeExpenses(filterExpensesByType(september!.expenses, 'pro'));
  const septemberAll = summarizeExpenses(filterExpensesByType(september!.expenses, 'all'));

  assert.equal(octoberGifts.byType.find((item) => item.type === 'gift')?.total, 8000);
  assert.equal(octoberGifts.total, 8000);
  assert.equal(octoberGifts.byType.find((item) => item.type === 'salary')?.total, 0);
  assert.equal(octoberSalaries.total, 100000);
  assert.equal(septemberPro.total, 20000);
  assert.equal(septemberAll.total, 20000);
  assert.notEqual(octoberGifts.total, septemberPro.total);
});

test('average includes salaries and gift counts ignore them', () => {
  const total = 35000 + 3000 + 8500 + 1500 + 70000;
  assert.equal(computeAverageExpensePerStudent(total, 4), 29500);
  assert.equal(computeAverageExpensePerStudent(total, 0), 0);

  const stats = normalizeExpenseStats({
    byType: { tablet: 35000, gift: 3000, pro: 8500, other: 1500, salary: 70000 },
    studentCount: 4,
    gifts: [
      { studentId: 's-anna', studentName: 'Анна', count: 2 },
      { studentId: 's-ivan', studentName: 'Иван', count: 4 },
    ],
  });
  assert.ok(stats);
  assert.equal(stats?.total, total);
  assert.equal(stats?.averagePerStudent, Math.round(total / 4));
  assert.deepEqual(
    stats?.gifts.map((item) => item.studentId),
    ['s-ivan', 's-anna'],
  );
});

test('gift counter is derived from gift rows and sorted by count', () => {
  const counts = buildGiftCounts([
    expense({ id: 'g1', type: 'gift', studentId: 's-max', amount: 1000 }),
    expense({ id: 'g2', type: 'gift', studentId: 's-ivan', amount: 1000 }),
    expense({ id: 'g3', type: 'gift', studentId: 's-ivan', amount: 2000 }),
    expense({ id: 'g4', type: 'gift', studentId: 's-ivan', amount: 500 }),
    expense({ id: 'g5', type: 'gift', studentId: 's-ivan', amount: 500 }),
    expense({ id: 'g6', type: 'gift', studentId: 's-anna', amount: 700 }),
    expense({ id: 'g7', type: 'gift', studentId: 's-anna', amount: 700 }),
    expense({ id: 'tablet', type: 'tablet', studentId: 's-ivan', amount: 35000 }),
    expense({ id: 'pro', type: 'pro', amount: 8500 }),
    expense({
      id: 'salary',
      type: 'salary',
      employeeName: 'Дима',
      amount: 70000,
    }),
  ]);

  assert.deepEqual(
    counts.map((item) => [item.studentId, item.count]),
    [
      ['s-ivan', 4],
      ['s-anna', 2],
      ['s-max', 1],
    ],
  );
});

test('assistants cannot access expenses and student delete cascades them', () => {
  assert.equal(isAssistantAllowedCrmApiRequest('GET', '/api/crm/expenses'), false);
  assert.equal(isAssistantAllowedCrmApiRequest('POST', '/api/crm/expenses'), false);
  assert.equal(
    isAssistantAllowedCrmApiRequest('PATCH', '/api/crm/expenses/e-1'),
    false,
  );
  assert.equal(
    isAssistantAllowedCrmApiRequest('DELETE', '/api/crm/expenses/e-1'),
    false,
  );
  assert.equal(isAssistantAllowedCrmApiRequest('GET', '/api/crm/payments'), false);
  assert.ok(STUDENT_HARD_DELETE_CASCADE_STEPS.includes('expenses'));
});

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`verify-expenses: ${passed} passed`);
