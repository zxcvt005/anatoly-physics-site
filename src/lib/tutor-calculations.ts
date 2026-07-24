import {
  CRM_DATE_DISPLAY_FALLBACK,
  formatCrmDate,
  formatCrmDateTime,
  getCrmDateMs,
} from '@/lib/crm-datetime';
import { getLessonDateKey, isLessonChargeable } from '@/lib/lesson-utils';
import type { LessonQueueCoverage } from '@/lib/lesson-payment-queue';
import {
  buildStudentPaymentContext,
  getPaymentQueueLessons,
} from '@/lib/lesson-payment-queue';
import type {
  AttendanceStatus,
  Lesson,
  LessonDisplayStatus,
  Payment,
  Student,
} from '@/types/tutor';

export type { LessonQueueCoverage, StudentPaymentContext } from '@/lib/lesson-payment-queue';
export {
  buildStudentPaymentContext,
  getLessonQueueCoverage,
  getPaymentQueueLessons,
} from '@/lib/lesson-payment-queue';

export function getConfirmedPaymentPresets(payments: Payment[]): number[] {
  const amounts = payments
    .filter((payment) => payment.status === 'confirmed')
    .map((payment) => payment.amount);

  return [...new Set(amounts)].sort((a, b) => a - b);
}

export function getConfirmedPaymentsTotal(
  studentId: string,
  allPayments: Payment[],
): number {
  return allPayments
    .filter((p) => p.studentId === studentId && p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0);
}

export function getBalance(
  student: Student,
  studentLessons: Lesson[],
  studentPayments: Payment[],
): number {
  const confirmedTotal = getConfirmedPaymentsTotal(student.id, studentPayments);
  const spentOnCompleted = studentLessons.filter(isLessonChargeable).length;

  return confirmedTotal - spentOnCompleted * student.ratePerLesson;
}

export function getPaidLessonsRemaining(
  balance: number,
  ratePerLesson: number,
): number {
  if (ratePerLesson <= 0) return 0;
  return Math.floor(balance / ratePerLesson);
}

export function getPaymentLessonsEstimate(
  amount: number,
  ratePerLesson: number,
): number {
  if (ratePerLesson <= 0) return 0;
  return Math.floor(amount / ratePerLesson);
}

export function pluralizeLessons(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} занятие`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} занятия`;
  }
  return `${count} занятий`;
}

export function getLessonDisplayStatus(lesson: Lesson): LessonDisplayStatus {
  if (lesson.paymentStatus === 'pending') return 'pending';
  if (lesson.status === 'completed' && lesson.paymentStatus === 'unpaid') {
    return 'unpaid';
  }
  if (lesson.status === 'completed') return 'completed';
  if (lesson.paymentStatus === 'paid') return 'paid';
  return 'scheduled';
}

export function getCoveredUntilLesson(
  student: Student,
  studentLessons: Lesson[],
  studentPayments: Payment[],
): { lesson: Lesson; date: string } | null {
  const context = buildStudentPaymentContext(
    student,
    studentLessons,
    studentPayments,
  );

  const lastCovered = getPaymentQueueLessons(studentLessons)
    .filter((item) => context.coverageByLessonId.get(item.id) === 'covered')
    .at(-1);

  if (!lastCovered) return null;

  return { lesson: lastCovered, date: lastCovered.date };
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return formatCrmDate(dateStr, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateWithoutYear(dateStr: string): string {
  return formatCrmDate(dateStr, {
    day: 'numeric',
    month: 'long',
  });
}

export function formatDateShort(dateStr: string): string {
  return formatCrmDate(dateStr, {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTime(dateStr: string): string {
  return formatCrmDateTime(dateStr, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(dateStr: string): string {
  return formatCrmDate(dateStr, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLessonDate(dateStr: string): string {
  return formatCrmDate(dateStr, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
}

export type CalendarLessonStatus =
  | 'completed'
  | 'covered'
  | 'pending'
  | 'required'
  | 'outside_schedule'
  | 'transferred'
  | 'transfer';

export const calendarStatusLabels: Record<CalendarLessonStatus, string> = {
  completed: 'Проведено',
  covered: 'Покрыто оплатой',
  pending: 'Ожидает подтверждения',
  required: 'Требуется оплата',
  outside_schedule: 'Занятие вне расписания',
  transferred: 'Перенесено',
  transfer: 'Перенос занятия',
};

function coverageToCalendarStatus(
  coverage: LessonQueueCoverage | undefined,
  lesson: Lesson,
): CalendarLessonStatus {
  if (
    lesson.status === 'completed' &&
    lesson.attendance === 'transferred'
  ) {
    return 'transferred';
  }
  if (lesson.lessonType === 'transfer' && lesson.status === 'scheduled') {
    return 'transfer';
  }
  if (lesson.status === 'completed') return 'completed';
  if (coverage === 'pending' || lesson.paymentStatus === 'pending') {
    return 'pending';
  }
  if (coverage === 'covered') return 'covered';
  return 'required';
}

export function getCalendarLessonStatus(
  lesson: Lesson,
  coverage?: LessonQueueCoverage,
): CalendarLessonStatus {
  return coverageToCalendarStatus(coverage, lesson);
}

export { getLessonDateKey };

export function formatMonthYear(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    return CRM_DATE_DISPLAY_FALLBACK;
  }

  const formatted = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatStudentShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts[1][0]}.`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Воскресенье',
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
};

export const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  0: 'Вс',
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
};

export const dayOfWeekNames = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
] as const;

export type FutureLessonPaymentStatus = 'covered' | 'pending' | 'required';

export function getFutureLessonPaymentStatus(
  lesson: Lesson,
  coverage?: LessonQueueCoverage,
): FutureLessonPaymentStatus {
  if (coverage === 'pending' || lesson.paymentStatus === 'pending') {
    return 'pending';
  }
  if (coverage === 'covered') return 'covered';
  return 'required';
}

export function getPaidUntilDate(
  student: Student,
  studentLessons: Lesson[],
  studentPayments: Payment[],
): string | null {
  return buildStudentPaymentContext(
    student,
    studentLessons,
    studentPayments,
  ).paidUntilDate;
}

export function getNextLesson(lessons: Lesson[]): Lesson | null {
  const upcoming = lessons
    .filter((l) => l.status === 'scheduled')
    .sort((a, b) => (getCrmDateMs(a.date) ?? 0) - (getCrmDateMs(b.date) ?? 0));

  return upcoming[0] ?? null;
}

export function formatRemainingLessons(count: number): string {
  if (count <= 0) return 'Нет оплаченных занятий';

  const mod10 = count % 10;
  const mod100 = count % 100;

  let word: string;
  if (mod100 >= 11 && mod100 <= 14) {
    word = 'занятий';
  } else if (mod10 === 1) {
    word = 'занятие';
  } else if (mod10 >= 2 && mod10 <= 4) {
    word = 'занятия';
  } else {
    word = 'занятий';
  }

  return `Ещё на ${count} ${word}`;
}

const attendanceLabels: Record<AttendanceStatus, string> = {
  planned: 'Запланировано',
  present: 'Был',
  late: 'Опоздал',
  absent: 'Не был',
  transferred: 'Перенесено',
};

const homeworkStatusLabels = {
  done: 'Сделано',
  partial: 'Частично',
  not_done: 'Не сделано',
} as const;

export function formatAttendance(status?: AttendanceStatus): string {
  if (!status) return '—';
  return attendanceLabels[status];
}

export function formatHomeworkStatus(
  status?: keyof typeof homeworkStatusLabels,
): string {
  if (!status) return '—';
  return homeworkStatusLabels[status];
}
