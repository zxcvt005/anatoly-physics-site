import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { upsertMockExamResultInSupabase } from '@/lib/supabase/mock-exams/repository';

export async function PATCH(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as {
    studentId?: string;
    mockExamId?: string;
    score?: string | number | null;
  };

  if (!body.studentId?.trim() || !body.mockExamId?.trim()) {
    return crmApiJson({
      ok: false,
      error: 'Missing studentId or mockExamId',
    });
  }

  const rawScore =
    body.score === null || body.score === undefined
      ? ''
      : String(body.score);

  return crmApiJson(
    await upsertMockExamResultInSupabase(
      body.studentId,
      body.mockExamId,
      rawScore,
    ),
  );
}
