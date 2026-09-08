import { NextResponse } from 'next/server';
import { isCrmAdminAuthenticated } from '@/lib/auth/crm-access/guard.server';
import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { fetchCrmTestStatsDetailFromSupabase } from '@/lib/supabase/tests/grades-test-stats-repository';

export async function GET(
  _request: Request,
  context: { params: Promise<{ testId: string }> },
) {
  if (!(await isCrmAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { testId } = await context.params;
  if (!testId) {
    return NextResponse.json(
      { ok: false, error: 'Missing testId' },
      { status: 400 },
    );
  }

  const result = await fetchCrmTestStatsDetailFromSupabase(testId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return crmApiJson(result);
}
