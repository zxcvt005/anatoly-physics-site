export const EXPENSE_TYPES = ['tablet', 'gift', 'pro', 'salary', 'other'] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export type ExpenseTypeDefinition = {
  type: ExpenseType;
  label: string;
  pluralLabel: string;
  requiresStudent: boolean;
  requiresEmployee: boolean;
  usesPeriod: boolean;
  requiresDescription: boolean;
};

export type Expense = {
  id: string;
  /** Код типа. Известные коды — `ExpenseType`; неизвестные показываются как есть. */
  type: string;
  studentId: string | null;
  /** Имя сотрудника. Только «Зарплата», без связи с учеником. */
  employeeName: string | null;
  amount: number;
  /** YYYY-MM-DD. Заполнена для всех типов, кроме «Профи». */
  expenseDate: string | null;
  /** YYYY-MM-DD. Только «Профи». Месяц группировки — по этой дате. */
  periodStart: string | null;
  periodEnd: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseInput = {
  type: ExpenseType;
  studentId?: string | null;
  employeeName?: string | null;
  amount: number;
  expenseDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  description?: string | null;
};

export type NormalizedExpenseInput = {
  type: ExpenseType;
  studentId: string | null;
  employeeName: string | null;
  amount: number;
  expenseDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  description: string | null;
};

export type ExpenseGiftCount = {
  studentId: string;
  studentName: string;
  count: number;
};

export type ExpenseStats = {
  byType: Record<string, number>;
  total: number;
  studentCount: number;
  averagePerStudent: number;
  gifts: ExpenseGiftCount[];
};

export type ExpensesBundle = {
  expenses: Expense[];
  stats: ExpenseStats;
  /** Знаменатель месячного среднего: YYYY-MM → student_count snapshot / live. */
  monthStudentCounts: Record<string, number>;
  /** Текущий месяц CRM (Europe/Moscow) как YYYY-MM. */
  currentMonthKey: string;
};

export type ExpenseWriteResult = {
  expense: Expense | null;
  stats: ExpenseStats;
  monthStudentCounts: Record<string, number>;
  currentMonthKey: string;
};
