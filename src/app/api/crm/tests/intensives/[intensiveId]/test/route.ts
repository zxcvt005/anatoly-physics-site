import { NextResponse } from 'next/server';
import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  deleteIntensiveTestInSupabase,
  hideIntensiveTestInSupabase,
} from '@/lib/supabase/tests/repository';

interface RouteContext {
  params: Promise<{ intensiveId: string }>;
}

function respondDelete(result: Awaited<ReturnType<typeof deleteIntensiveTestInSupabase>>) {
  if (!result.ok && result.code === 'TEST_IN_USE') {
    return NextResponse.json(result, { status: 409 });
  }
  if (!result.ok && result.code === 'TEST_NOT_FOUND') {
    return NextResponse.json(result, { status: 404 });
  }
  return crmApiJson(result);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { intensiveId } = await context.params;
  return respondDelete(await deleteIntensiveTestInSupabase(intensiveId));
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { intensiveId } = await context.params;
  const body = (await request.json()) as { action?: string };

  if (body.action !== 'hide') {
    return crmApiJson({ ok: false, error: 'Unknown action' });
  }

  const result = await hideIntensiveTestInSupabase(intensiveId);
  if (!result.ok && result.code === 'TEST_NOT_FOUND') {
    return NextResponse.json(result, { status: 404 });
  }

  return crmApiJson(result);
}
