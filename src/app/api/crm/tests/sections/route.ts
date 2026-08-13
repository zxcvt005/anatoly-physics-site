import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchLessonTopicSectionsFromSupabase,
  insertLessonTopicSectionToSupabase,
  reorderLessonTopicSectionsInSupabase,
} from '@/lib/supabase/tests/repository';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  return crmApiJson(await fetchLessonTopicSectionsFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const body = (await request.json()) as {
    title?: string;
    orderedIds?: string[];
  };

  if (body.orderedIds) {
    return crmApiJson(await reorderLessonTopicSectionsInSupabase(body.orderedIds));
  }

  if (!body.title) {
    return crmApiJson({ ok: false, error: 'Missing title' });
  }

  return crmApiJson(await insertLessonTopicSectionToSupabase(body.title), 201);
}
