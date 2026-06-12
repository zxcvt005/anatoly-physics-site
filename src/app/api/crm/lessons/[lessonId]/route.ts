import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  deleteLessonFromSupabase,
  updateLessonInSupabase,
} from '@/lib/supabase/lessons/repository';
import type { Lesson } from '@/types/tutor';

interface RouteContext {
  params: Promise<{ lessonId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { lessonId } = await context.params;
  const body = (await request.json()) as { patch?: Partial<Lesson> };

  if (!body.patch) {
    return crmApiJson({ ok: false, error: 'Missing patch' });
  }

  return crmApiJson(await updateLessonInSupabase(lessonId, body.patch));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { lessonId } = await context.params;
  return crmApiJson(await deleteLessonFromSupabase(lessonId));
}
