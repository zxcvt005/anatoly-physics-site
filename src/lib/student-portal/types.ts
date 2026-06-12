import type {
  Intensive,
  Lesson,
  Payment,
  Student,
  StudentIntensiveProgress,
  WeeklyScheduleSlot,
} from '@/types/tutor';

export interface StudentPortalData {
  student: Student;
  slots: WeeklyScheduleSlot[];
  payments: Payment[];
  lessons: Lesson[];
  intensives: Intensive[];
  intensiveProgress: StudentIntensiveProgress[];
}

export type StudentPortalRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
