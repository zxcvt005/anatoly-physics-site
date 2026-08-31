import type { SupabaseClient } from '@supabase/supabase-js';

async function resolveStudentUuid(
  client: SupabaseClient,
  studentAppId: string,
): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('app_id', studentAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: `Student not found: ${studentAppId}` };
  }

  return { ok: true, data: data.id };
}

async function clearStudentLessonCrossReferences(
  client: SupabaseClient,
  studentUuid: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: lessonRows, error: selectError } = await client
    .from('lessons')
    .select('id')
    .eq('student_id', studentUuid);

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  const lessonIds = (lessonRows ?? []).map((row) => row.id);
  if (lessonIds.length === 0) {
    return { ok: true };
  }

  const { error: makeupError } = await client
    .from('lessons')
    .update({ makeup_for_lesson_id: null })
    .in('makeup_for_lesson_id', lessonIds);

  if (makeupError) {
    return { ok: false, error: makeupError.message };
  }

  const { error: transferToError } = await client
    .from('lessons')
    .update({ transferred_to_lesson_id: null })
    .in('transferred_to_lesson_id', lessonIds);

  if (transferToError) {
    return { ok: false, error: transferToError.message };
  }

  const { error: transferFromError } = await client
    .from('lessons')
    .update({ transferred_from_lesson_id: null })
    .in('transferred_from_lesson_id', lessonIds);

  if (transferFromError) {
    return { ok: false, error: transferFromError.message };
  }

  return { ok: true };
}

/**
 * Hard-delete a student and all student-owned rows.
 * Uses RPC `delete_student_by_app_id` when available (single DB transaction),
 * otherwise falls back to ordered deletes scoped by `students.id`.
 */
export async function hardDeleteStudentByAppId(
  client: SupabaseClient,
  studentAppId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: rpcError } = await client.rpc('delete_student_by_app_id', {
    p_app_id: studentAppId,
  });

  if (!rpcError) {
    return { ok: true };
  }

  const rpcMissing =
    rpcError.code === 'PGRST202' ||
    rpcError.message.includes('delete_student_by_app_id') ||
    rpcError.message.toLowerCase().includes('could not find the function');

  if (!rpcMissing) {
    return { ok: false, error: rpcError.message };
  }

  return hardDeleteStudentByAppIdSequential(client, studentAppId);
}

async function hardDeleteStudentByAppIdSequential(
  client: SupabaseClient,
  studentAppId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const studentResult = await resolveStudentUuid(client, studentAppId);
  if (!studentResult.ok) {
    return studentResult;
  }

  const studentUuid = studentResult.data;

  const clearRefsResult = await clearStudentLessonCrossReferences(
    client,
    studentUuid,
  );
  if (!clearRefsResult.ok) {
    return clearRefsResult;
  }

  const { error: paymentsError } = await client
    .from('payments')
    .delete()
    .eq('student_id', studentUuid);

  if (paymentsError) {
    return { ok: false, error: paymentsError.message };
  }

  const { error: lessonsError } = await client
    .from('lessons')
    .delete()
    .eq('student_id', studentUuid);

  if (lessonsError) {
    return { ok: false, error: lessonsError.message };
  }

  const { error: studentError } = await client
    .from('students')
    .delete()
    .eq('id', studentUuid);

  if (studentError) {
    return { ok: false, error: studentError.message };
  }

  return { ok: true };
}
