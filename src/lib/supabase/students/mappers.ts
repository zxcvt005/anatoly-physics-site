import { getMoscowDateKey } from '@/lib/lesson-datetime';
import {
  applyActivityStatusTransition,
  normalizePauseIntervals,
} from '@/lib/student-pause-intervals';
import { normalizeStudent } from '@/lib/student-utils';
import type { StudentFormInput } from '@/lib/students/form';
import type { Student, StudentPauseInterval } from '@/types/tutor';
import type { StudentInsertRow, StudentRow, StudentUpdateRow } from './types';

function parsePauseIntervals(value: unknown): StudentPauseInterval[] {
  if (!Array.isArray(value)) return [];
  return normalizePauseIntervals(value as StudentPauseInterval[]);
}

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
    pauseIntervals: parsePauseIntervals(row.pause_intervals),
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
    pause_intervals: normalized.pauseIntervals ?? [],
  };
}

export function studentFormInputToUpdateRow(
  input: StudentFormInput,
  existingStudent: Student,
  todayDateKey: string = getMoscowDateKey(),
): StudentUpdateRow {
  const nextStatus = input.activityStatus ?? 'active';
  const pauseIntervals = applyActivityStatusTransition(
    existingStudent.pauseIntervals,
    existingStudent.activityStatus,
    nextStatus,
    todayDateKey,
  );

  const normalized = normalizeStudent({
    ...existingStudent,
    firstName: input.firstName,
    lastName: input.lastName,
    gradeClass: input.gradeClass,
    rate4Weeks: input.rate4Weeks,
    lessonsPerWeek: input.lessonsPerWeek,
    parentContacts: input.parentContacts?.trim() || undefined,
    activityStatus: nextStatus,
    pauseComment:
      nextStatus === 'paused'
        ? input.pauseComment?.trim() || undefined
        : undefined,
    pauseIntervals,
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
    pause_intervals: normalized.pauseIntervals ?? [],
  };
}
