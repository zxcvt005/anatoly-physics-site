export type MockExam = {
  id: string;
  title: string;
  examDate: string;
  maxScore: number;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * score is always a finite integer when present.
 * Missing entry means the result was never set (not the same as 0).
 */
export type MockExamResult = {
  id: string;
  mockExamId: string;
  studentId: string;
  score: number;
  createdAt?: string;
  updatedAt?: string;
};

export type MockExamsBundle = {
  exams: MockExam[];
  results: MockExamResult[];
};

export type MockExamInput = {
  title: string;
  examDate: string;
  maxScore: number;
};

export type MockExamUpdateInput = {
  title?: string;
  examDate?: string;
  maxScore?: number;
};

export type StudentMockExamView = {
  exam: MockExam;
  score: number;
  percent: number;
};

export type StudentMockExamStats = {
  count: number;
  averagePercent: number | null;
  bestPercent: number | null;
  latestPercent: number | null;
};
