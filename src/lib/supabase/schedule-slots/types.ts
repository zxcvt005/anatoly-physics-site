export interface ScheduleSlotRow {
  id: string;
  app_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleSlotStudentJoinRow {
  schedule_slot_id: string;
  students: {
    app_id: string;
  } | null;
}

type ScheduleSlotStudentRelation =
  | { app_id: string }
  | { app_id: string }[]
  | null;

export interface ScheduleSlotWithStudentsRow extends ScheduleSlotRow {
  schedule_slot_students: Array<{
    created_at?: string;
    students: ScheduleSlotStudentRelation;
  }> | null;
}

export type ScheduleSlotsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
