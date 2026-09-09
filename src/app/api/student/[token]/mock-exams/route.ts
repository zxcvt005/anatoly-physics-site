import { NextResponse } from 'next/server';
import { fetchStudentByAccessTokenFromSupabase } from '@/lib/supabase/students/repository.server';
import { fetchStudentMockExamsBundleByStudentAppId } from '@/lib/supabase/mock-exams/repository';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  if (!isSupabaseConfiguredOnServer()) {
    return NextResponse.json(
      { ok: false, error: 'Supabase is not configured' },
      { status: 503 },
    );
  }

  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Missing token' },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  if (url.searchParams.has('studentId')) {
    return NextResponse.json(
      {
        ok: false,
        error: 'studentId query parameter is not allowed',
      },
      { status: 400 },
    );
  }

  const student = await fetchStudentByAccessTokenFromSupabase(token);
  if (!student) {
    return NextResponse.json(
      { ok: false, error: 'Student not found' },
      { status: 404 },
    );
  }

  const result = await fetchStudentMockExamsBundleByStudentAppId(student.id);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  // Hard security guarantee: only this student's results leave the server.
  const results = result.data.results.filter(
    (item) => item.studentId === student.id,
  );
  const examIds = new Set(results.map((item) => item.mockExamId));
  const exams = result.data.exams.filter((exam) => examIds.has(exam.id));

  return NextResponse.json({
    ok: true,
    data: {
      studentId: student.id,
      exams,
      results,
    },
  });
}
