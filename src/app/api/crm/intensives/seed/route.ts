import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { seedIntensivesBundleToSupabase } from '@/lib/supabase/intensives/repository';
import type { IntensivesBundle } from '@/lib/supabase/intensives/types';

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as IntensivesBundle;
  return crmApiJson(
    await seedIntensivesBundleToSupabase({
      intensives: body.intensives ?? [],
      progress: body.progress ?? [],
    }),
    201,
  );
}
