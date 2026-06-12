import { buildSlotsByWeekday } from '@/lib/schedule-utils';
import { filterActiveStudents, isStudentPaused } from '@/lib/student-utils';
import type { Payment, RevenueMonthSnapshot, Student, WeeklyScheduleSlot } from '@/types/tutor';

export interface RevenueSummaryCards {
  potentialMonthlyIncome: number;
  receivedCurrentMonth: number;
  averageLessonRate: number;
  averageHourlyRate: number;
}

export interface SlotRevenueItem {
  slot: WeeklyScheduleSlot;
  revenue: number;
  studentCount: number;
}

export interface MonthRevenueView {
  monthKey: string;
  label: string;
  isCurrentMonth: boolean;
  isFrozen: boolean;
  potentialIncome: number;
  receivedIncome: number;
  payments: Payment[];
}

export interface CurrentMonthTaxSummary {
  received: number;
  taxAccounted: number;
  notAccounted: number;
}

export function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

export function formatMonthKeyLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const date = new Date(year, month - 1, 1);
  return formatMonthYearCapitalized(date);
}

function formatMonthYearCapitalized(date: Date): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function isDateInMonth(dateStr: string, monthKey: string): boolean {
  return dateStr.slice(0, 7) === monthKey;
}

export function computePotentialMonthlyIncome(students: Student[]): number {
  return filterActiveStudents(students).reduce(
    (sum, student) => sum + student.rate4Weeks,
    0,
  );
}

export function computeReceivedInMonth(
  payments: Payment[],
  monthKey: string,
): number {
  return payments
    .filter(
      (payment) =>
        payment.status === 'confirmed' &&
        isDateInMonth(payment.createdAt, monthKey),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function computeStudentLessonRate(student: Student): number {
  const lessonsPerMonth = student.lessonsPerWeek * 4;
  if (lessonsPerMonth <= 0 || student.rate4Weeks <= 0) return 0;
  return Math.round(student.rate4Weeks / lessonsPerMonth);
}

/** Средняя стоимость одного занятия для одного ученика */
export function computeAverageLessonRate(students: Student[]): number {
  const activeStudents = filterActiveStudents(students);
  if (activeStudents.length === 0) return 0;

  const total = activeStudents.reduce(
    (sum, student) => sum + computeStudentLessonRate(student),
    0,
  );
  return Math.round(total / activeStudents.length);
}

function parseTimeToDecimalHours(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

export function getSlotDurationHours(slot: WeeklyScheduleSlot): number {
  const duration =
    parseTimeToDecimalHours(slot.endTime) -
    parseTimeToDecimalHours(slot.startTime);
  return duration > 0 ? duration : 0;
}

/**
 * Недельный доход по слотам / суммарные часы расписания.
 * Учитывает наполняемость слотов (несколько учеников в одном слоте).
 */
export function computeAverageHourlyRate(
  slots: WeeklyScheduleSlot[],
  studentsById: Map<string, Student>,
): number {
  if (slots.length === 0) return 0;

  const weeklyRevenue = slots.reduce(
    (sum, slot) => sum + computeSlotWeeklyRevenue(slot, studentsById),
    0,
  );
  const totalHours = slots.reduce(
    (sum, slot) => sum + getSlotDurationHours(slot),
    0,
  );

  if (totalHours <= 0) return 0;
  return Math.round(weeklyRevenue / totalHours);
}

export function computeRevenueSummaryCards(
  students: Student[],
  payments: Payment[],
  slots: WeeklyScheduleSlot[],
  referenceDate: Date = new Date(),
): RevenueSummaryCards {
  const currentMonthKey = getMonthKey(referenceDate);
  const studentsById = new Map(students.map((student) => [student.id, student]));

  return {
    potentialMonthlyIncome: computePotentialMonthlyIncome(students),
    receivedCurrentMonth: computeReceivedInMonth(payments, currentMonthKey),
    averageLessonRate: computeAverageLessonRate(students),
    averageHourlyRate: computeAverageHourlyRate(slots, studentsById),
  };
}

/** Доход слота за одно занятие (неделя): сумма ratePerLesson учеников в слоте */
export function computeSlotWeeklyRevenue(
  slot: WeeklyScheduleSlot,
  studentsById: Map<string, Student>,
): number {
  return slot.studentIds.reduce((sum, studentId) => {
    const student = studentsById.get(studentId);
    if (!student || isStudentPaused(student)) return sum;
    return sum + student.ratePerLesson;
  }, 0);
}

export function countActiveStudentsInSlot(
  slot: WeeklyScheduleSlot,
  studentsById: Map<string, Student>,
): number {
  return slot.studentIds.filter((studentId) => {
    const student = studentsById.get(studentId);
    return Boolean(student && !isStudentPaused(student));
  }).length;
}

/** Зеркало расписания: слоты по дням недели с доходом за занятие */
export function buildScheduleRevenueByWeekday(
  slots: WeeklyScheduleSlot[],
  studentsById: Map<string, Student>,
): Map<number, SlotRevenueItem[]> {
  const slotsByWeekday = buildSlotsByWeekday(slots);
  const result = new Map<number, SlotRevenueItem[]>();

  for (const [weekday, daySlots] of slotsByWeekday) {
    result.set(
      weekday,
      daySlots.map((slot) => ({
        slot,
        revenue: computeSlotWeeklyRevenue(slot, studentsById),
        studentCount: countActiveStudentsInSlot(slot, studentsById),
      })),
    );
  }

  return result;
}

export function getDistinctPaymentMonthKeys(payments: Payment[]): string[] {
  const keys = new Set<string>();

  for (const payment of payments) {
    if (payment.status !== 'confirmed') continue;
    keys.add(payment.createdAt.slice(0, 7));
  }

  return [...keys].sort((a, b) => b.localeCompare(a));
}

export function buildMonthRevenueViews(
  students: Student[],
  payments: Payment[],
  snapshots: RevenueMonthSnapshot[],
  referenceDate: Date = new Date(),
): MonthRevenueView[] {
  const currentMonthKey = getMonthKey(referenceDate);
  const snapshotByKey = new Map(
    snapshots.map((snapshot) => [snapshot.monthKey, snapshot]),
  );

  const monthKeys = new Set<string>([
    ...snapshots.map((snapshot) => snapshot.monthKey),
    ...getDistinctPaymentMonthKeys(payments),
    currentMonthKey,
  ]);

  const livePotential = computePotentialMonthlyIncome(students);

  return [...monthKeys]
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => {
      const snapshot = snapshotByKey.get(monthKey);
      const isCurrentMonth = monthKey === currentMonthKey;
      const isFrozen = Boolean(snapshot) && !isCurrentMonth;
      const monthPayments = payments
        .filter(
          (payment) =>
            payment.status === 'confirmed' &&
            isDateInMonth(payment.createdAt, monthKey),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      const receivedIncome = isFrozen
        ? snapshot!.receivedIncome
        : computeReceivedInMonth(payments, monthKey);

      const potentialIncome = isFrozen
        ? snapshot!.potentialIncome
        : isCurrentMonth
          ? livePotential
          : computeReceivedInMonth(payments, monthKey) || livePotential;

      return {
        monthKey,
        label: formatMonthKeyLabel(monthKey),
        isCurrentMonth,
        isFrozen,
        potentialIncome,
        receivedIncome,
        payments: monthPayments,
      };
    });
}

export function computeCurrentMonthTaxSummary(
  payments: Payment[],
  referenceDate: Date = new Date(),
): CurrentMonthTaxSummary {
  const currentMonthKey = getMonthKey(referenceDate);
  const monthPayments = payments.filter(
    (payment) =>
      payment.status === 'confirmed' &&
      isDateInMonth(payment.createdAt, currentMonthKey),
  );

  const received = monthPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const taxAccounted = monthPayments
    .filter((payment) => payment.taxAccounted)
    .reduce((sum, payment) => sum + payment.amount, 0);

  return {
    received,
    taxAccounted,
    notAccounted: received - taxAccounted,
  };
}

export function createMonthSnapshot(
  monthKey: string,
  students: Student[],
  payments: Payment[],
): RevenueMonthSnapshot {
  return {
    monthKey,
    potentialIncome: computePotentialMonthlyIncome(students),
    receivedIncome: computeReceivedInMonth(payments, monthKey),
    frozenAt: new Date().toISOString(),
  };
}
