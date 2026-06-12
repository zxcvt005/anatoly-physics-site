import type { StudentFormInput } from '@/lib/students/form';
import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  deleteStudentFromSupabase,
  updateStudentInSupabase,
} from '@/lib/supabase/students/repository';
import type { Student } from '@/types/tutor';

interface RouteContext {
  params: Promise<{ studentId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { studentId } = await context.params;
  const body = (await request.json()) as {
    input?: StudentFormInput;
    existingStudent?: Student;
  };

  if (!body.input || !body.existingStudent) {
    return crmApiJson({ ok: false, error: 'Missing input or existingStudent' });
  }

  return crmApiJson(
    await updateStudentInSupabase(studentId, body.input, body.existingStudent),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { studentId } = await context.params;
  return crmApiJson(await deleteStudentFromSupabase(studentId));
}
