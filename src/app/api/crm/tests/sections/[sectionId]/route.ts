import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  archiveLessonTopicSectionInSupabase,
  updateLessonTopicSectionTitleInSupabase,
} from '@/lib/supabase/tests/repository';

interface RouteContext {
  params: Promise<{ sectionId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { sectionId } = await context.params;
  const body = (await request.json()) as { title?: string };

  if (!body.title) {
    return crmApiJson({ ok: false, error: 'Missing title' });
  }

  return crmApiJson(
    await updateLessonTopicSectionTitleInSupabase(sectionId, body.title),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { sectionId } = await context.params;
  return crmApiJson(await archiveLessonTopicSectionInSupabase(sectionId));
}
