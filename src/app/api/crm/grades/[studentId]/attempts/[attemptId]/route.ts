import { NextResponse } from 'next/server';
import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { fetchCrmCompletedAttemptReviewFromSupabase } from '@/lib/supabase/tests/grades-repository';

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ studentId: string; attemptId: string }>;
  },
) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { studentId, attemptId } = await context.params;
  if (!studentId || !attemptId) {
    return NextResponse.json(
      { ok: false, error: 'Missing studentId or attemptId' },
      { status: 400 },
    );
  }

  const result = await fetchCrmCompletedAttemptReviewFromSupabase({
    studentAppId: studentId,
    attemptAppId: attemptId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return crmApiJson(result);
}
