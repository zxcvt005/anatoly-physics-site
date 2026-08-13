import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchLessonTopicsFromSupabase,
  insertLessonTopicToSupabase,
  reorderLessonTopicsInSupabase,
  searchLessonTopicsFromSupabase,
} from '@/lib/supabase/tests/repository';

export async function GET(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (query) {
    return crmApiJson(await searchLessonTopicsFromSupabase(query));
  }

  return crmApiJson(await fetchLessonTopicsFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const body = (await request.json()) as {
    title?: string;
    sectionId?: string | null;
    orderedIds?: string[];
  };

  if (body.orderedIds) {
    return crmApiJson(await reorderLessonTopicsInSupabase(body.orderedIds));
  }

  if (!body.title) {
    return crmApiJson({ ok: false, error: 'Missing title' });
  }

  return crmApiJson(
    await insertLessonTopicToSupabase(body.title, body.sectionId),
    201,
  );
}
