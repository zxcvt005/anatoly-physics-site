import type {
  Intensive,
  IntensiveStatus,
  StudentIntensiveProgress,
} from '@/types/tutor';

export interface IntensiveRow {
  id: string;
  app_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StudentIntensiveProgressRow {
  id: string;
  student_id: string;
  intensive_id: string;
  status: IntensiveStatus;
  created_at: string;
  updated_at: string;
}

type RelatedAppId =
  | { app_id: string }
  | { app_id: string }[]
  | null;

export interface StudentIntensiveProgressWithAppIdsRow {
  status: IntensiveStatus;
  students: RelatedAppId;
  intensives: RelatedAppId;
}

export interface IntensivesBundle {
  intensives: Intensive[];
  progress: StudentIntensiveProgress[];
}

export type IntensivesRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
