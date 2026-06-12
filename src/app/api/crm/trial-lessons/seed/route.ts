import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { seedTrialLessonsToSupabase } from '@/lib/supabase/trial-lessons/repository';
import type { TrialLesson } from '@/types/tutor';

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { trials?: TrialLesson[] };
  return crmApiJson(
    await seedTrialLessonsToSupabase(body.trials ?? []),
    201,
  );
}
