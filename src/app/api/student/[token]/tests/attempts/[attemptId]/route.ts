import { NextResponse } from 'next/server';
import {
  fetchAttemptForStudentFromSupabase,
  fetchCompletedAttemptReviewFromSupabase,
} from '@/lib/supabase/tests/repository';
import { fetchStudentByAccessTokenFromSupabase } from '@/lib/supabase/students/repository.server';

interface RouteContext {
  params: Promise<{ token: string; attemptId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { token, attemptId } = await context.params;
  const view = new URL(request.url).searchParams.get('view');
  const student = await fetchStudentByAccessTokenFromSupabase(token);

  if (!student) {
    return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
  }

  if (view === 'review') {
    const result = await fetchCompletedAttemptReviewFromSupabase({
      studentAppId: student.id,
      attemptAppId: attemptId,
    });

    if (!result.ok) {
      const status = result.error === 'Review is only available for completed attempts'
        ? 403
        : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  }

  return NextResponse.json(
    await fetchAttemptForStudentFromSupabase({
      studentAppId: student.id,
      attemptAppId: attemptId,
    }),
  );
}
