export type MockExamRow = {
  id: string;
  app_id: string;
  title: string;
  exam_date: string;
  max_score: number;
  created_at: string;
  updated_at: string;
};

export type MockExamResultRow = {
  id: string;
  app_id: string;
  mock_exam_id: string;
  student_id: string;
  score: number;
  created_at: string;
  updated_at: string;
};

export type MockExamResultWithAppIdsRow = {
  id: string;
  app_id: string;
  score: number;
  created_at: string;
  updated_at: string;
  students: { app_id: string } | { app_id: string }[] | null;
  mock_exams: { app_id: string } | { app_id: string }[] | null;
};

export type MockExamsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
