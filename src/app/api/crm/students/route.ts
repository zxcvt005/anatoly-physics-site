import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchStudentsFromSupabase,
  insertStudentToSupabase,
} from '@/lib/supabase/students/repository';
import type { Student } from '@/types/tutor';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  return crmApiJson(await fetchStudentsFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { student?: Student };
  if (!body.student) {
    return crmApiJson({ ok: false, error: 'Missing student' });
  }

  return crmApiJson(await insertStudentToSupabase(body.student), 201);
}
