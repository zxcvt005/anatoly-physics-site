import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { seedStudentsToSupabase } from '@/lib/supabase/students/repository';
import type { Student } from '@/types/tutor';

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { students?: Student[] };
  return crmApiJson(
    await seedStudentsToSupabase(body.students ?? []),
    201,
  );
}
