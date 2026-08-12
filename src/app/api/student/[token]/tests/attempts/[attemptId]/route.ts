import { NextResponse } from 'next/server';
import { fetchAttemptForStudentFromSupabase } from '@/lib/supabase/tests/repository';
import { fetchStudentByAccessTokenFromSupabase } from '@/lib/supabase/students/repository.server';

interface RouteContext {
  params: Promise<{ token: string; attemptId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token, attemptId } = await context.params;
  const student = await fetchStudentByAccessTokenFromSupabase(token);

  if (!student) {
    return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
  }

  return NextResponse.json(
    await fetchAttemptForStudentFromSupabase({
      studentAppId: student.id,
      attemptAppId: attemptId,
    }),
  );
}
