import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { upsertLessonsInSupabase } from '@/lib/supabase/lessons/repository';
import type { Lesson } from '@/types/tutor';

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { lessons?: Lesson[] };

  return crmApiJson(
    await upsertLessonsInSupabase(body.lessons ?? []),
    201,
  );
}
