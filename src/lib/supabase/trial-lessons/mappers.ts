import type { TrialLesson } from '@/types/tutor';
import type {
  TrialLessonInsertRow,
  TrialLessonUpdateRow,
  TrialLessonWithStudentRow,
} from './types';

function extractLinkedStudentAppId(
  students: { app_id: string } | { app_id: string }[] | null | undefined,
): string | undefined {
  if (!students) {
    return undefined;
  }

  if (Array.isArray(students)) {
    return students[0]?.app_id;
  }

  return students.app_id;
}

function deriveParentFields(parentContacts: string): {
  parentName: string;
  parentPhone: string;
  parentContacts: string | null;
} {
  const trimmed = parentContacts.trim();

  if (!trimmed) {
    return {
      parentName: '—',
      parentPhone: 'unknown',
      parentContacts: null,
    };
  }

  const phoneMatch = trimmed.match(/\+?\d[\d\s\-()]{8,}/);
  const parentPhone = phoneMatch
    ? phoneMatch[0].replace(/\s/g, '')
    : 'unknown';

  const firstSegment = trimmed.split(',')[0]?.trim() ?? '';
  const labeledName = firstSegment.match(/^([^:]+):/)?.[1]?.trim();

  let parentName = labeledName ?? '';

  if (!parentName && firstSegment && !/^\+?\d/.test(firstSegment)) {
    parentName = firstSegment;
  }

  if (!parentName) {
    parentName = '—';
  }

  return {
    parentName,
    parentPhone,
    parentContacts: trimmed,
  };
}

function rowToParentContacts(row: TrialLessonWithStudentRow): string {
  if (row.parent_contacts?.trim()) {
    return row.parent_contacts.trim();
  }

  const parts = [row.parent_name, row.parent_phone].filter(
    (value) => value && value !== '—' && value !== 'unknown',
  );

  return parts.join(', ');
}

export function trialLessonRowToTrialLesson(
  row: TrialLessonWithStudentRow,
): TrialLesson {
  const linkedStudentId = extractLinkedStudentAppId(row.students);

  return {
    id: row.app_id,
    firstName: row.first_name,
    lastName: row.last_name,
    trialDate: row.trial_date,
    gradeClass: row.grade_class,
    goal: row.goal,
    currentResult: row.current_result,
    proposedRate4Weeks: row.proposed_rate_4_weeks,
    proposedLessonsPerWeek: row.proposed_lessons_per_week,
    parentContacts: rowToParentContacts(row),
    callStatus: row.call_status,
    comment: row.comment ?? undefined,
    linkedStudentId,
    createdAt: row.created_at,
  };
}

export function mapTrialLessonRows(
  rows: TrialLessonWithStudentRow[] | null,
): TrialLesson[] {
  return (rows ?? []).map(trialLessonRowToTrialLesson);
}

export function trialLessonToInsertRow(
  trial: TrialLesson,
  linkedStudentUuid: string | null,
): TrialLessonInsertRow {
  const parentFields = deriveParentFields(trial.parentContacts);

  return {
    app_id: trial.id,
    first_name: trial.firstName,
    last_name: trial.lastName,
    trial_date: trial.trialDate,
    grade_class: trial.gradeClass,
    goal: trial.goal,
    current_result: trial.currentResult,
    proposed_rate_4_weeks: trial.proposedRate4Weeks,
    proposed_lessons_per_week: trial.proposedLessonsPerWeek,
    parent_name: parentFields.parentName,
    parent_phone: parentFields.parentPhone,
    parent_contacts: parentFields.parentContacts,
    call_status: trial.callStatus,
    comment: trial.comment ?? null,
    linked_student_id: linkedStudentUuid,
  };
}

export function trialLessonPatchToUpdateRow(
  trial: TrialLesson,
  linkedStudentUuid: string | null,
): TrialLessonUpdateRow {
  const parentFields = deriveParentFields(trial.parentContacts);

  return {
    first_name: trial.firstName,
    last_name: trial.lastName,
    trial_date: trial.trialDate,
    grade_class: trial.gradeClass,
    goal: trial.goal,
    current_result: trial.currentResult,
    proposed_rate_4_weeks: trial.proposedRate4Weeks,
    proposed_lessons_per_week: trial.proposedLessonsPerWeek,
    parent_name: parentFields.parentName,
    parent_phone: parentFields.parentPhone,
    parent_contacts: parentFields.parentContacts,
    call_status: trial.callStatus,
    comment: trial.comment ?? null,
    linked_student_id: linkedStudentUuid,
  };
}
