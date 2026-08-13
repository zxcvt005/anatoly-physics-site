import { isLessonChargeable } from '@/lib/lesson-utils';
import { computeStudentProgressStats } from '@/lib/student-progress';
import { pluralizeLessons } from '@/lib/tutor-calculations';
import type { Lesson, Payment, Student, WeeklyScheduleSlot } from '@/types/tutor';

export interface StudentAdminRowStats {
  conductedLessons: number;
  remainingLessons: number;
  averageHomeworkPercent: number | null;
  absencesCount: number;
}

export type StudentAdminStatusId =
  | 'pending_payment'
  | 'negative_balance'
  | 'no_schedule'
  | 'many_absences';

export interface StudentAdminStatus {
  id: StudentAdminStatusId;
  label: string;
  emoji: string;
}

export const MANY_ABSENCES_THRESHOLD = 3;

function getConfirmedPaymentsTotal(
  studentId: string,
  payments: Payment[],
): number {
  return payments
    .filter(
      (payment) =>
        payment.studentId === studentId && payment.status === 'confirmed',
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function computeStudentAdminStats(
  student: Student,
  lessons: Lesson[],
  payments: Payment[],
): StudentAdminRowStats {
  const studentLessons = lessons.filter(
    (lesson) => lesson.studentId === student.id,
  );

  const conductedLessons = studentLessons.filter(
    (lesson) =>
      lesson.status === 'completed' &&
      (lesson.attendance === 'present' || lesson.attendance === 'late'),
  ).length;

  const chargeableCompleted = studentLessons.filter(isLessonChargeable).length;
  const confirmedTotal = getConfirmedPaymentsTotal(student.id, payments);
  const paidSlots =
    student.ratePerLesson > 0
      ? Math.floor(confirmedTotal / student.ratePerLesson)
      : 0;
  const remainingLessons = paidSlots - chargeableCompleted;
  const progress = computeStudentProgressStats(studentLessons);

  return {
    conductedLessons,
    remainingLessons,
    averageHomeworkPercent: progress.averageHomeworkPercent,
    absencesCount: progress.absencesCount,
  };
}

function getScheduledStudentIds(slots: WeeklyScheduleSlot[]): Set<string> {
  const ids = new Set<string>();

  for (const slot of slots) {
    for (const studentId of slot.studentIds) {
      ids.add(studentId);
    }
  }

  return ids;
}

export function computeStudentAdminStatuses(
  student: Student,
  stats: StudentAdminRowStats,
  payments: Payment[],
  slots: WeeklyScheduleSlot[],
): StudentAdminStatus[] {
  const statuses: StudentAdminStatus[] = [];
  const scheduledStudentIds = getScheduledStudentIds(slots);

  if (
    payments.some(
      (payment) =>
        payment.studentId === student.id && payment.status === 'pending',
    )
  ) {
    statuses.push({
      id: 'pending_payment',
      emoji: '🔔',
      label: 'Заявка на оплату',
    });
  }

  if (stats.remainingLessons < 0) {
    statuses.push({
      id: 'negative_balance',
      emoji: '🔴',
      label: 'Минус по занятиям',
    });
  }

  if (!scheduledStudentIds.has(student.id)) {
    statuses.push({
      id: 'no_schedule',
      emoji: '🟠',
      label: 'Нет расписания',
    });
  }

  if (stats.absencesCount >= MANY_ABSENCES_THRESHOLD) {
    statuses.push({
      id: 'many_absences',
      emoji: '🟡',
      label: 'Много пропусков',
    });
  }

  return statuses;
}

export function formatAverageHomeworkShort(percent: number | null): string {
  if (percent === null) return '—';
  return `${Math.round(percent)}%`;
}

export function formatRemainingLessons(count: number): string {
  if (count === 0) return '0 занятий';
  const prefix = count < 0 ? '−' : '';
  return `${prefix}${pluralizeLessons(Math.abs(count))}`;
}
