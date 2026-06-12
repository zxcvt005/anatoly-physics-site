import type { TrialCallStatus } from '@/types/tutor';

export interface TrialLessonRow {
  id: string;
  app_id: string;
  first_name: string;
  last_name: string;
  trial_date: string;
  grade_class: string;
  goal: string;
  current_result: string;
  proposed_rate_4_weeks: number;
  proposed_lessons_per_week: number;
  parent_name: string;
  parent_phone: string;
  parent_contacts: string | null;
  call_status: TrialCallStatus;
  comment: string | null;
  linked_student_id: string | null;
  created_at: string;
  updated_at: string;
}

type LinkedStudentRelation =
  | { app_id: string }
  | { app_id: string }[]
  | null;

export interface TrialLessonWithStudentRow extends TrialLessonRow {
  students: LinkedStudentRelation;
}

export type TrialLessonInsertRow = Omit<
  TrialLessonRow,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
};

export type TrialLessonUpdateRow = Partial<
  Omit<TrialLessonRow, 'id' | 'app_id' | 'created_at' | 'updated_at'>
>;

export type TrialLessonsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
