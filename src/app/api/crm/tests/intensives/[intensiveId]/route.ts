import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchIntensiveTestFromSupabase,
  fetchIntensiveTestStatsFromSupabase,
  saveIntensiveTestInSupabase,
} from '@/lib/supabase/tests/repository';
import type { SaveTestInput } from '@/types/tests';

interface RouteContext {
  params: Promise<{ intensiveId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { intensiveId } = await context.params;
  const { searchParams } = new URL(request.url);

  if (searchParams.get('view') === 'stats') {
    return crmApiJson(await fetchIntensiveTestStatsFromSupabase(intensiveId));
  }

  return crmApiJson(await fetchIntensiveTestFromSupabase(intensiveId));
}

export async function PUT(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { intensiveId } = await context.params;
  const body = (await request.json()) as { test?: SaveTestInput };

  if (!body.test) {
    return crmApiJson({ ok: false, error: 'Missing test payload' });
  }

  return crmApiJson(await saveIntensiveTestInSupabase(intensiveId, body.test));
}
