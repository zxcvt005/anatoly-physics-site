import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchLessonsFromSupabase,
  upsertLessonInSupabase,
} from '@/lib/supabase/lessons/repository';
import type { Lesson } from '@/types/tutor';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  return crmApiJson(await fetchLessonsFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { lesson?: Lesson };

  if (!body.lesson) {
    return crmApiJson({ ok: false, error: 'Missing lesson' });
  }

  return crmApiJson(await upsertLessonInSupabase(body.lesson), 201);
}
