import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  archiveLessonTopicInSupabase,
  fetchHomeworkTestByTopicFromSupabase,
  fetchTopicTestStatsFromSupabase,
  saveHomeworkTestForTopicInSupabase,
  updateLessonTopicTitleInSupabase,
} from '@/lib/supabase/tests/repository';
import type { SaveTestInput } from '@/types/tests';

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
  const body = (await request.json()) as { title?: string };

  if (!body.title) {
    return crmApiJson({ ok: false, error: 'Missing title' });
  }

  return crmApiJson(await updateLessonTopicTitleInSupabase(topicId, body.title));
}

export async function PUT(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { topicId } = await context.params;
  const body = (await request.json()) as { test?: SaveTestInput };

  if (!body.test) {
    return crmApiJson({ ok: false, error: 'Missing test payload' });
  }

  return crmApiJson(await saveHomeworkTestForTopicInSupabase(topicId, body.test));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { topicId } = await context.params;
  return crmApiJson(await archiveLessonTopicInSupabase(topicId));
}
