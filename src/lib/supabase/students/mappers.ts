import { normalizeStudent } from '@/lib/student-utils';
import type { StudentFormInput } from '@/lib/students/form';
import type { Student } from '@/types/tutor';
import type { StudentInsertRow, StudentRow, StudentUpdateRow } from './types';

export function studentRowToStudent(row: StudentRow): Student {
  return normalizeStudent({
    id: row.app_id ?? row.id,
    name: row.name,
    firstName: row.first_name,
    lastName: row.last_name,
    gradeClass: row.grade_class,
    token: row.access_token,
    rate4Weeks: row.rate_4_weeks,
    lessonsPerWeek: row.lessons_per_week,
    parentContacts: row.parent_contacts ?? undefined,
    activityStatus: row.activity_status,
    pauseComment: row.pause_comment ?? undefined,
    ratePerLesson: 0,
    startedAt: row.started_at ?? undefined,
    createdAt: row.created_at,
  });
}

export function studentToInsertRow(student: Student): StudentInsertRow {
  const normalized = normalizeStudent(student);

  return {
    app_id: normalized.id,
    first_name: normalized.firstName,
    last_name: normalized.lastName,
    name: normalized.name,
    grade_class: normalized.gradeClass,
    access_token: normalized.token,
    rate_4_weeks: normalized.rate4Weeks,
    lessons_per_week: normalized.lessonsPerWeek,
    started_at: null,
    parent_contacts: normalized.parentContacts ?? null,
    activity_status: normalized.activityStatus ?? 'active',
    pause_comment: normalized.pauseComment ?? null,
  };
}

export function studentFormInputToUpdateRow(
  input: StudentFormInput,
  existingStudent: Student,
): StudentUpdateRow {
  const normalized = normalizeStudent({
    ...existingStudent,
    firstName: input.firstName,
    lastName: input.lastName,
    gradeClass: input.gradeClass,
    rate4Weeks: input.rate4Weeks,
    lessonsPerWeek: input.lessonsPerWeek,
    parentContacts: input.parentContacts?.trim() || undefined,
    activityStatus: input.activityStatus ?? 'active',
    pauseComment:
      input.activityStatus === 'paused'
        ? input.pauseComment?.trim() || undefined
        : undefined,
  });

  return {
    first_name: normalized.firstName,
    last_name: normalized.lastName,
    name: normalized.name,
    grade_class: normalized.gradeClass,
    rate_4_weeks: normalized.rate4Weeks,
    lessons_per_week: normalized.lessonsPerWeek,
    parent_contacts: normalized.parentContacts ?? null,
    activity_status: normalized.activityStatus ?? 'active',
    pause_comment: normalized.pauseComment ?? null,
  };
}
