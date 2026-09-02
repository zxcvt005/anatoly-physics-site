import type { Student, TrialCallStatus, WeeklyScheduleSlot } from '@/types/tutor';

export const TRIAL_CALL_STATUS_LABELS: Record<TrialCallStatus, string> = {
  not_called: 'Не созванивались',
  agreed: 'Договорились',
  not_agreed: 'Не договорились',
};

export function findStudentByName(
  students: Student[],
  firstName: string,
  lastName: string,
): Student | undefined {
  const normalizedFirst = firstName.trim().toLowerCase();
  const normalizedLast = lastName.trim().toLowerCase();

  if (!normalizedFirst || !normalizedLast) {
    return undefined;
  }

  return students.find(
    (student) =>
      student.firstName.trim().toLowerCase() === normalizedFirst &&
      student.lastName.trim().toLowerCase() === normalizedLast,
  );
}

export function isStudentInSchedule(
  studentId: string,
  slots: WeeklyScheduleSlot[],
): boolean {
  return slots.some((slot) => slot.studentIds.includes(studentId));
}

export function generateTrialLessonId(): string {
  return `trial-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
