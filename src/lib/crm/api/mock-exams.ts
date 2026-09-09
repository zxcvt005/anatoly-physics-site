import type {
  MockExam,
  MockExamResult,
  MockExamsBundle,
  MockExamUpdateInput,
} from '@/lib/mock-exams/types';
import type { MockExamsRepositoryResult } from '@/lib/supabase/mock-exams/types';
import { crmApiDelete, crmApiGet, crmApiPatch, crmApiPost } from './http';

const BASE = '/api/crm/mock-exams';

export async function fetchMockExamsBundle(): Promise<
  MockExamsRepositoryResult<MockExamsBundle>
> {
  return crmApiGet<MockExamsBundle>(BASE);
}

export async function createMockExam(exam: MockExam): Promise<
  MockExamsRepositoryResult<MockExam>
> {
  return crmApiPost<MockExam>(BASE, { exam });
}

export async function updateMockExam(
  mockExamId: string,
  input: MockExamUpdateInput,
): Promise<MockExamsRepositoryResult<MockExam>> {
  return crmApiPatch<MockExam>(`${BASE}/${encodeURIComponent(mockExamId)}`, input);
}

export async function deleteMockExam(
  mockExamId: string,
): Promise<MockExamsRepositoryResult<null>> {
  return crmApiDelete<null>(`${BASE}/${encodeURIComponent(mockExamId)}`);
}

export async function upsertMockExamResult(
  studentId: string,
  mockExamId: string,
  score: string,
): Promise<MockExamsRepositoryResult<MockExamResult | null>> {
  return crmApiPatch<MockExamResult | null>(`${BASE}/results`, {
    studentId,
    mockExamId,
    score,
  });
}
