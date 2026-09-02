import type { TrialCallStatus } from '@/types/tutor';

export interface TrialLessonFormInput {
  firstName: string;
  lastName: string;
  trialDate: string;
  gradeClass: string;
  goal: string;
  currentResult: string;
  proposedRate4Weeks: number;
  proposedLessonsPerWeek: number;
  parentContacts: string;
  comment?: string;
  callStatus?: TrialCallStatus;
  linkedStudentId?: string;
}

export function normalizeTrialLastName(
  lastName: string | null | undefined,
): string {
  return (lastName ?? '').trim();
}

export function withNormalizedTrialLastName<
  T extends { lastName?: string | null },
>(value: T): T & { lastName: string } {
  return {
    ...value,
    lastName: normalizeTrialLastName(value.lastName),
  };
}

export function isTrialLessonFormReady(fields: {
  firstName: string;
  trialDate: string;
  gradeClass: string;
  goal: string;
  currentResult: string;
  proposedRate4Weeks: number;
  proposedLessonsPerWeek: number;
  parentContacts: string;
}): boolean {
  return Boolean(
    fields.firstName.trim() &&
      fields.trialDate &&
      fields.gradeClass.trim() &&
      fields.goal.trim() &&
      fields.currentResult.trim() &&
      fields.proposedRate4Weeks > 0 &&
      fields.proposedLessonsPerWeek > 0 &&
      fields.parentContacts.trim(),
  );
}
