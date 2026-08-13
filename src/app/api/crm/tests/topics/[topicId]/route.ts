import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  archiveLessonTopicInSupabase,
  fetchHomeworkTestByTopicFromSupabase,
  fetchTopicTestStatsFromSupabase,
  saveHomeworkTestForTopicInSupabase,
  updateLessonTopicSectionInSupabase,
  updateLessonTopicTitleInSupabase,
} from '@/lib/supabase/tests/repository';
import type { SaveTestInput } from '@/types/tests';
import { logTestEditorSave } from '@/lib/tests/editor-diagnostics.server';

interface RouteContext {
  params: Promise<{ topicId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { topicId } = await context.params;
  const { searchParams } = new URL(_request.url);

  if (searchParams.get('view') === 'stats') {
    return crmApiJson(await fetchTopicTestStatsFromSupabase(topicId));
  }

  return crmApiJson(await fetchHomeworkTestByTopicFromSupabase(topicId));
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { topicId } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    sectionId?: string | null;
  };

  if (body.sectionId !== undefined) {
    return crmApiJson(
      await updateLessonTopicSectionInSupabase(topicId, body.sectionId),
    );
  }

  if (!body.title) {
    return crmApiJson({ ok: false, error: 'Missing title or sectionId' });
  }

  return crmApiJson(await updateLessonTopicTitleInSupabase(topicId, body.title));
}

export async function PUT(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const startedAt = Date.now();
  const { topicId } = await context.params;
  const body = (await request.json()) as { test?: SaveTestInput };

  if (!body.test) {
    const result = { ok: false as const, error: 'Missing test payload' };
    logTestEditorSave({
      operation: 'save',
      topicId,
      questionCount: 0,
      ok: false,
      httpStatus: 400,
      durationMs: Date.now() - startedAt,
      error: result.error,
    });
    return crmApiJson(result);
  }

  const result = await saveHomeworkTestForTopicInSupabase(topicId, body.test);
  logTestEditorSave({
    operation: 'save',
    topicId,
    questionCount: body.test.questions?.length ?? 0,
    ok: result.ok,
    httpStatus: result.ok ? 200 : 400,
    durationMs: Date.now() - startedAt,
    testId: result.ok ? result.data.test.id : undefined,
    version: result.ok ? result.data.test.version : undefined,
    questionsReturned: result.ok ? result.data.questions.length : undefined,
    error: result.ok ? undefined : result.error,
  });

  return crmApiJson(result);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { topicId } = await context.params;
  return crmApiJson(await archiveLessonTopicInSupabase(topicId));
}
