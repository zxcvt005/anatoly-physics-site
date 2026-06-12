import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchTrialLessonsFromSupabase,
  insertTrialLessonToSupabase,
} from '@/lib/supabase/trial-lessons/repository';
import type { TrialLesson } from '@/types/tutor';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  return crmApiJson(await fetchTrialLessonsFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { trial?: TrialLesson };
  if (!body.trial) {
    return crmApiJson({ ok: false, error: 'Missing trial' });
  }

  return crmApiJson(await insertTrialLessonToSupabase(body.trial), 201);
}
