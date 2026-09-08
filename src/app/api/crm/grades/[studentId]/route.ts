import { NextResponse } from 'next/server';
import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { fetchCrmStudentGradesFromSupabase } from '@/lib/supabase/tests/grades-repository';

export async function GET(
  _request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { studentId } = await context.params;
  if (!studentId) {
    return NextResponse.json(
      { ok: false, error: 'Missing studentId' },
      { status: 400 },
    );
  }

  const result = await fetchCrmStudentGradesFromSupabase(studentId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return crmApiJson(result);
}
