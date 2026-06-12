import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { seedLessonsToSupabase } from '@/lib/supabase/lessons/repository';
import type { Lesson } from '@/types/tutor';

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as Lesson[];
  return crmApiJson(await seedLessonsToSupabase(body ?? []), 201);
}
