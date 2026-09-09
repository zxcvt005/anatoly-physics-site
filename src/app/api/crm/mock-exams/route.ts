import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { generateMockExamId } from '@/lib/mock-exams/validation';
import type { MockExam } from '@/lib/mock-exams/types';
import {
  fetchMockExamsBundleFromSupabase,
  insertMockExamToSupabase,
} from '@/lib/supabase/mock-exams/repository';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  return crmApiJson(await fetchMockExamsBundleFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as {
    exam?: Partial<MockExam>;
    title?: string;
    examDate?: string;
    maxScore?: number;
  };

  const title = body.exam?.title ?? body.title;
  const examDate = body.exam?.examDate ?? body.examDate;
  const maxScore = body.exam?.maxScore ?? body.maxScore;

  if (
    typeof title !== 'string' ||
    typeof examDate !== 'string' ||
    typeof maxScore !== 'number'
  ) {
    return crmApiJson({
      ok: false,
      error: 'Missing title, examDate, or maxScore',
    });
  }

  const exam: MockExam = {
    id: body.exam?.id?.trim() || generateMockExamId(),
    title,
    examDate,
    maxScore,
  };

  return crmApiJson(await insertMockExamToSupabase(exam), 201);
}
