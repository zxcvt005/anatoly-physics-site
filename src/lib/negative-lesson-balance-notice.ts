import { computeStudentAdminStats } from '@/lib/student-admin-stats';
import type { Lesson, Payment, Student } from '@/types/tutor';

export interface NegativeBalanceNoticeState {
  open: boolean;
  deficitLessons: number;
  /** Dismissal applies only while the balance stays negative. */
  dismissed: boolean;
}

export function initialNegativeBalanceNoticeState(): NegativeBalanceNoticeState {
  return { open: false, deficitLessons: 0, dismissed: false };
}

export function readStudentLessonBalance(
  student: Student,
  lessons: Lesson[],
  payments: Payment[],
): number {
  return computeStudentAdminStats(student, lessons, payments).remainingLessons;
}

export function reduceNegativeBalanceNotice(
  state: NegativeBalanceNoticeState,
  event:
    | { type: 'balance'; remainingLessons: number }
    | { type: 'dismiss' },
): NegativeBalanceNoticeState {
  if (event.type === 'dismiss') {
    return { ...state, open: false, dismissed: true };
  }

  if (event.remainingLessons >= 0) {
    return { open: false, deficitLessons: 0, dismissed: false };
  }

  const deficitLessons = Math.abs(event.remainingLessons);

  if (state.dismissed) {
    return { ...state, open: false, deficitLessons };
  }

  return { open: true, deficitLessons, dismissed: false };
}
