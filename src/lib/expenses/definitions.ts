import {
  EXPENSE_TYPES,
  type ExpenseType,
  type ExpenseTypeDefinition,
} from '@/lib/expenses/types';

export const EXPENSE_TYPE_DEFINITIONS: readonly ExpenseTypeDefinition[] = [
  {
    type: 'tablet',
    label: 'Планшет',
    pluralLabel: 'Планшеты',
    requiresStudent: true,
    requiresEmployee: false,
    usesPeriod: false,
    requiresDescription: false,
  },
  {
    type: 'gift',
    label: 'Подарок',
    pluralLabel: 'Подарки',
    requiresStudent: true,
    requiresEmployee: false,
    usesPeriod: false,
    requiresDescription: false,
  },
  {
    type: 'pro',
    label: 'Профи',
    pluralLabel: 'Профи',
    requiresStudent: false,
    requiresEmployee: false,
    usesPeriod: true,
    requiresDescription: false,
  },
  {
    type: 'salary',
    label: 'Зарплата',
    pluralLabel: 'Зарплаты',
    requiresStudent: false,
    requiresEmployee: true,
    usesPeriod: false,
    requiresDescription: false,
  },
  {
    type: 'other',
    label: 'Другое',
    pluralLabel: 'Другое',
    requiresStudent: true,
    requiresEmployee: false,
    usesPeriod: false,
    requiresDescription: true,
  },
];

const DEFINITIONS_BY_TYPE = new Map(
  EXPENSE_TYPE_DEFINITIONS.map((definition) => [definition.type, definition]),
);

export function isExpenseType(value: string): value is ExpenseType {
  return (EXPENSE_TYPES as readonly string[]).includes(value);
}

export function getExpenseTypeDefinition(
  type: string,
): ExpenseTypeDefinition | null {
  return isExpenseType(type) ? (DEFINITIONS_BY_TYPE.get(type) ?? null) : null;
}

export function getExpenseTypeLabel(type: string): string {
  return getExpenseTypeDefinition(type)?.label ?? type;
}

export function getExpenseTypePluralLabel(type: string): string {
  return getExpenseTypeDefinition(type)?.pluralLabel ?? type;
}
