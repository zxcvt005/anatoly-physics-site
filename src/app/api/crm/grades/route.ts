import { NextResponse } from 'next/server';
import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { fetchCrmGradesOverviewFromSupabase } from '@/lib/supabase/tests/grades-repository';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const result = await fetchCrmGradesOverviewFromSupabase();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return crmApiJson(result);
}
