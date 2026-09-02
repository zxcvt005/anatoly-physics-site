import { NextResponse } from 'next/server';
import { fetchStudentByAccessTokenFromSupabase } from '@/lib/supabase/students/repository.server';
import { dismissTestAssignmentInSupabase } from '@/lib/supabase/tests/repository';

interface RouteContext {
  params: Promise<{ token: string; assignmentId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { token, assignmentId } = await context.params;
  const student = await fetchStudentByAccessTokenFromSupabase(token);

  if (!student) {
    return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
  }

  const body = (await request.json()) as { dismissed?: boolean };

  if (body.dismissed !== true) {
    return NextResponse.json(
      { ok: false, error: 'Only dismissed: true is supported' },
      { status: 400 },
    );
  }

  const result = await dismissTestAssignmentInSupabase({
    studentAppId: student.id,
    assignmentAppId: assignmentId,
  });

  if (!result.ok) {
    const status = result.error === 'Assignment does not belong to this student' ? 403 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
