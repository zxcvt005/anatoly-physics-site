import { NextResponse } from 'next/server';
import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  deleteHomeworkTestForTopicInSupabase,
  hideHomeworkTestForTopicInSupabase,
} from '@/lib/supabase/tests/repository';
import { logTestDelete } from '@/lib/tests/editor-diagnostics.server';

interface RouteContext {
  params: Promise<{ topicId: string }>;
}

function respondDelete(
  topicId: string,
  startedAt: number,
  result: Awaited<ReturnType<typeof deleteHomeworkTestForTopicInSupabase>>,
) {
  const httpStatus = !result.ok
    ? result.code === 'TEST_NOT_FOUND'
      ? 404
      : 400
    : 200;

  logTestDelete({
    operation: 'delete',
    topicId,
    ok: result.ok,
    httpStatus,
    durationMs: Date.now() - startedAt,
    code: result.ok ? undefined : result.code,
    error: result.ok ? undefined : result.error,
  });

  if (!result.ok && result.code === 'TEST_NOT_FOUND') {
    return NextResponse.json(result, { status: 404 });
  }
  return crmApiJson(result);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const startedAt = Date.now();
  const { topicId } = await context.params;
  return respondDelete(
    topicId,
    startedAt,
    await deleteHomeworkTestForTopicInSupabase(topicId),
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const startedAt = Date.now();
  const { topicId } = await context.params;
  const body = (await request.json()) as { action?: string };

  if (body.action !== 'hide') {
    return crmApiJson({ ok: false, error: 'Unknown action' });
  }

  const result = await hideHomeworkTestForTopicInSupabase(topicId);
  logTestDelete({
    operation: 'hide',
    topicId,
    ok: result.ok,
    httpStatus: !result.ok
      ? result.code === 'TEST_NOT_FOUND'
        ? 404
        : 400
      : 200,
    durationMs: Date.now() - startedAt,
    code: result.ok ? undefined : result.code,
    error: result.ok ? undefined : result.error,
  });
  if (!result.ok && result.code === 'TEST_NOT_FOUND') {
    return NextResponse.json(result, { status: 404 });
  }

  return crmApiJson(result);
}
