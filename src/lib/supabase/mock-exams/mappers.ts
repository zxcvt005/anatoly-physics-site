import type { MockExam, MockExamResult } from '@/lib/mock-exams/types';
import type {
  MockExamResultWithAppIdsRow,
  MockExamRow,
} from '@/lib/supabase/mock-exams/types';

function nestedAppId(
  value: { app_id: string } | { app_id: string }[] | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0]?.app_id ?? null;
  }
  return value.app_id;
}

export function mapMockExamRow(row: MockExamRow): MockExam {
  return {
    id: row.app_id,
    title: row.title,
    examDate: row.exam_date,
    maxScore: row.max_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMockExamRows(rows: MockExamRow[] | null): MockExam[] {
  return (rows ?? []).map(mapMockExamRow);
}

export function mapMockExamResultRow(
  row: MockExamResultWithAppIdsRow,
): MockExamResult | null {
  const studentId = nestedAppId(row.students);
  const mockExamId = nestedAppId(row.mock_exams);

  if (!studentId || !mockExamId) {
    return null;
  }

  return {
    id: row.app_id,
    mockExamId,
    studentId,
    score: row.score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMockExamResultRows(
  rows: MockExamResultWithAppIdsRow[] | null,
): MockExamResult[] {
  return (rows ?? [])
    .map(mapMockExamResultRow)
    .filter((row): row is MockExamResult => row !== null);
}

export function mockExamToInsertRow(exam: MockExam): {
  app_id: string;
  title: string;
  exam_date: string;
  max_score: number;
} {
  return {
    app_id: exam.id,
    title: exam.title,
    exam_date: exam.examDate,
    max_score: exam.maxScore,
  };
}
