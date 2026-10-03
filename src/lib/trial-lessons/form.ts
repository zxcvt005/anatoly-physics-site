import { formatCrmMoscowDateKey } from '@/lib/crm-datetime';
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

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Trial lesson dates are stored as Postgres `date` and edited via
 * `<input type="date">`, so the app must keep YYYY-MM-DD (not ISO datetime).
 */
export function normalizeTrialDateInput(
  raw: string | null | undefined,
): string {
  if (raw == null) {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const fromMoscowKey = formatCrmMoscowDateKey(trimmed);
  if (fromMoscowKey) {
    return fromMoscowKey;
  }

  const prefix = trimmed.slice(0, 10);
  return DATE_ONLY_PATTERN.test(prefix) ? prefix : '';
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
