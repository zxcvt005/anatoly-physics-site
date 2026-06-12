import type { StudentActivityStatus } from '@/types/tutor';

export interface StudentRow {
  id: string;
  app_id: string | null;
  first_name: string;
  last_name: string;
  name: string;
  grade_class: string;
  access_token: string;
  rate_4_weeks: number;
  lessons_per_week: number;
  started_at: string | null;
  parent_contacts: string | null;
  activity_status: StudentActivityStatus;
  pause_comment: string | null;
  created_at: string;
  updated_at: string;
}

export type StudentInsertRow = Omit<
  StudentRow,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
};

export type StudentUpdateRow = Partial<
  Omit<StudentRow, 'id' | 'app_id' | 'created_at' | 'updated_at'>
>;

export type StudentsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
