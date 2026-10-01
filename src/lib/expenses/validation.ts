import { getExpenseTypeDefinition, isExpenseType } from '@/lib/expenses/definitions';
import type { ExpenseInput, NormalizedExpenseInput } from '@/lib/expenses/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DESCRIPTION_MAX_LENGTH = 500;
const EMPLOYEE_NAME_MAX_LENGTH = 200;

export function generateExpenseId(): string {
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidExpenseDate(value: string): boolean {
  if (!DATE_RE.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

export function validateExpenseInput(
  input: ExpenseInput,
): { ok: true; value: NormalizedExpenseInput } | { ok: false; error: string } {
  if (!isExpenseType(input.type)) {
    return { ok: false, error: 'Выберите тип расхода' };
  }

  const definition = getExpenseTypeDefinition(input.type);
  if (!definition) {
    return { ok: false, error: 'Выберите тип расхода' };
  }

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'Укажите сумму больше нуля' };
  }

  if (definition.usesPeriod) {
    const periodStart = input.periodStart?.trim() ?? '';
    const periodEnd = input.periodEnd?.trim() ?? '';

    if (!isValidExpenseDate(periodStart) || !isValidExpenseDate(periodEnd)) {
      return { ok: false, error: 'Укажите период расхода' };
    }

    if (periodEnd < periodStart) {
      return {
        ok: false,
        error: 'Дата окончания периода не может быть раньше даты начала',
      };
    }

    return {
      ok: true,
      value: {
        type: definition.type,
        studentId: null,
        employeeName: null,
        amount: input.amount,
        expenseDate: null,
        periodStart,
        periodEnd,
        description: null,
      },
    };
  }

  const expenseDate = input.expenseDate?.trim() ?? '';
  if (!isValidExpenseDate(expenseDate)) {
    return { ok: false, error: 'Укажите дату расхода' };
  }

  if (definition.requiresEmployee) {
    const employeeName = input.employeeName?.trim() ?? '';
    if (!employeeName) {
      return { ok: false, error: 'Укажите имя сотрудника' };
    }
    if (employeeName.length > EMPLOYEE_NAME_MAX_LENGTH) {
      return { ok: false, error: 'Имя сотрудника слишком длинное' };
    }

    return {
      ok: true,
      value: {
        type: definition.type,
        studentId: null,
        employeeName,
        amount: input.amount,
        expenseDate,
        periodStart: null,
        periodEnd: null,
        description: null,
      },
    };
  }

  const studentId = input.studentId?.trim() ?? '';
  if (!studentId) {
    return { ok: false, error: 'Выберите ученика' };
  }

  const description = input.description?.trim() ?? '';
  if (definition.requiresDescription && !description) {
    return { ok: false, error: 'Опишите, на что был расход' };
  }

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: 'Описание слишком длинное' };
  }

  return {
    ok: true,
    value: {
      type: definition.type,
      studentId,
      employeeName: null,
      amount: input.amount,
      expenseDate,
      periodStart: null,
      periodEnd: null,
      description: definition.requiresDescription ? description : null,
    },
  };
}
