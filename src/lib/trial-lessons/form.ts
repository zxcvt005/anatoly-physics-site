import { formatCrmMoscowDateKey } from '@/lib/crm-datetime';
import type { TrialCallStatus, TrialLesson } from '@/types/tutor';

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

export interface TrialLessonFormValues {
  firstName: string;
  lastName: string;
  /** Always YYYY-MM-DD for `<input type="date">`, or '' when unknown in edit. */
  trialDate: string;
  gradeClass: string;
  goal: string;
  currentResult: string;
  proposedRate4Weeks: string;
  proposedLessonsPerWeek: string;
  parentContacts: string;
  comment: string;
  callStatus: TrialCallStatus;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar today as YYYY-MM-DD (not UTC from toISOString). */
export function getTodayDateInputValue(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Trial lesson dates are stored as Postgres `date` and edited via
 * `<input type="date">`, so the app must keep YYYY-MM-DD (not ISO datetime).
 */
export function normalizeTrialDateInput(
  raw: string | Date | null | undefined,
): string {
  if (raw == null) {
    return '';
  }

  if (raw instanceof Date) {
    return formatCrmMoscowDateKey(raw) || '';
  }

  const trimmed = String(raw).trim();
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

/**
 * Builds controlled-input values for create/edit.
 * - CREATE (`trial == null`): today in the date field.
 * - EDIT: existing trialDate as YYYY-MM-DD (never replaced with today).
 */
export function getTrialLessonFormInitialValues(
  trial: TrialLesson | null | undefined,
  now: Date = new Date(),
): TrialLessonFormValues {
  if (!trial) {
    return {
      firstName: '',
      lastName: '',
      trialDate: getTodayDateInputValue(now),
      gradeClass: '',
      goal: '',
      currentResult: '',
      proposedRate4Weeks: '',
      proposedLessonsPerWeek: '2',
      parentContacts: '',
      comment: '',
      callStatus: 'not_called',
    };
  }

  return {
    firstName: trial.firstName ?? '',
    lastName: normalizeTrialLastName(trial.lastName),
    trialDate: normalizeTrialDateInput(trial.trialDate),
    gradeClass: trial.gradeClass ?? '',
    goal: trial.goal ?? '',
    currentResult: trial.currentResult ?? '',
    proposedRate4Weeks: String(trial.proposedRate4Weeks ?? ''),
    proposedLessonsPerWeek: String(trial.proposedLessonsPerWeek ?? '2'),
    parentContacts: trial.parentContacts ?? '',
    comment: trial.comment ?? '',
    callStatus: trial.callStatus ?? 'not_called',
  };
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
