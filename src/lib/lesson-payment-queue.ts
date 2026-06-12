import { isLessonChargeable } from '@/lib/lesson-utils';
import type { Lesson, Payment, Student } from '@/types/tutor';

function getConfirmedPaymentsTotal(
  studentId: string,
  studentPayments: Payment[],
): number {
  return studentPayments
    .filter(
      (payment) =>
        payment.studentId === studentId && payment.status === 'confirmed',
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
}

function getPendingPaymentsTotal(
  studentId: string,
  studentPayments: Payment[],
): number {
  return studentPayments
    .filter(
      (payment) =>
        payment.studentId === studentId && payment.status === 'pending',
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
}

/** Сколько занятий покроет сумма заявок на оплату после подтверждения */
export function getPendingPaymentLessonSlots(
  student: Student,
  studentPayments: Payment[],
): number {
  if (student.ratePerLesson <= 0) return 0;
  const pendingTotal = getPendingPaymentsTotal(student.id, studentPayments);
  return Math.floor(pendingTotal / student.ratePerLesson);
}

export type LessonQueueCoverage = 'covered' | 'required' | 'pending' | 'excluded';

export interface StudentPaymentContext {
  coverageByLessonId: Map<string, LessonQueueCoverage>;
  paidUntilDate: string | null;
  paidLessonSlots: number;
  pendingPaymentLessonSlots: number;
  remainingLessonSlots: number;
}

/** Занятие участвует в очереди списания оплаты */
export function isLessonInPaymentQueue(lesson: Lesson): boolean {
  if (lesson.status === 'scheduled') return true;
  if (lesson.status === 'completed') return isLessonChargeable(lesson);
  return false;
}

export function sortLessonsChronologically(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function getPaymentQueueLessons(lessons: Lesson[]): Lesson[] {
  return sortLessonsChronologically(lessons.filter(isLessonInPaymentQueue));
}

export function getPaidLessonSlots(
  student: Student,
  studentPayments: Payment[],
): number {
  if (student.ratePerLesson <= 0) return 0;
  const confirmedTotal = getConfirmedPaymentsTotal(student.id, studentPayments);
  return Math.floor(confirmedTotal / student.ratePerLesson);
}

export function buildStudentPaymentContext(
  student: Student,
  studentLessons: Lesson[],
  studentPayments: Payment[],
): StudentPaymentContext {
  const queue = getPaymentQueueLessons(studentLessons);
  const paidLessonSlots = getPaidLessonSlots(student, studentPayments);
  const pendingPaymentLessonSlots = getPendingPaymentLessonSlots(
    student,
    studentPayments,
  );
  let confirmedSlotsRemaining = paidLessonSlots;
  let pendingSlotsRemaining = pendingPaymentLessonSlots;

  const coverageByLessonId = new Map<string, LessonQueueCoverage>();

  for (const lesson of studentLessons) {
    if (!isLessonInPaymentQueue(lesson)) {
      coverageByLessonId.set(lesson.id, 'excluded');
    }
  }

  for (const lesson of queue) {
    if (lesson.paymentStatus === 'pending') {
      coverageByLessonId.set(lesson.id, 'pending');
      continue;
    }

    if (confirmedSlotsRemaining > 0) {
      coverageByLessonId.set(lesson.id, 'covered');
      confirmedSlotsRemaining -= 1;
      continue;
    }

    if (pendingSlotsRemaining > 0) {
      coverageByLessonId.set(lesson.id, 'pending');
      pendingSlotsRemaining -= 1;
      continue;
    }

    coverageByLessonId.set(lesson.id, 'required');
  }

  const paidUntilDate =
    [...queue]
      .filter((lesson) => coverageByLessonId.get(lesson.id) === 'covered')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      ?.date ?? null;

  return {
    coverageByLessonId,
    paidUntilDate,
    paidLessonSlots,
    pendingPaymentLessonSlots,
    remainingLessonSlots: confirmedSlotsRemaining,
  };
}

export function getLessonQueueCoverage(
  lessonId: string,
  context: StudentPaymentContext,
): LessonQueueCoverage | undefined {
  return context.coverageByLessonId.get(lessonId);
}
