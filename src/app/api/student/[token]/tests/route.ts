import { NextResponse } from 'next/server';
import { fetchStudentByAccessTokenFromSupabase } from '@/lib/supabase/students/repository.server';
import {
  fetchStudentHomeworkListFromSupabase,
  saveAttemptDraftInSupabase,
  startTestAttemptInSupabase,
  submitAttemptOneInSupabase,
  submitAttemptTwoInSupabase,
} from '@/lib/supabase/tests/repository';
import { logStudentAttemptSubmit } from '@/lib/tests/attempt-submit-diagnostics.server';
import type { StudentAnswerValue } from '@/types/tests';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const student = await fetchStudentByAccessTokenFromSupabase(token);

  if (!student) {
    return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
  }

  const homework = await fetchStudentHomeworkListFromSupabase(student.id);

  if (!homework.ok) {
    return NextResponse.json(homework, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      homework: homework.data,
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const student = await fetchStudentByAccessTokenFromSupabase(token);

  if (!student) {
    return NextResponse.json({ ok: false, error: 'Student not found' }, { status: 404 });
  }

  const body = (await request.json()) as {
    action?: string;
    testId?: string;
    assignmentId?: string;
    attemptId?: string;
    source?: 'lesson' | 'self';
    attemptNumber?: 1 | 2;
    answers?: Array<{ questionId: string; answer: StudentAnswerValue }>;
  };

  switch (body.action) {
    case 'start':
      if (!body.testId) {
        return NextResponse.json({ ok: false, error: 'Missing testId' }, { status: 400 });
      }
      return NextResponse.json(
        await startTestAttemptInSupabase({
          studentAppId: student.id,
          testAppId: body.testId,
          assignmentAppId: body.assignmentId,
          source: body.source ?? 'self',
        }),
      );
    case 'save_draft':
      if (!body.attemptId || !body.attemptNumber || !body.answers) {
        return NextResponse.json({ ok: false, error: 'Invalid draft payload' }, { status: 400 });
      }
      return NextResponse.json(
        await saveAttemptDraftInSupabase({
          studentAppId: student.id,
          attemptAppId: body.attemptId,
          attemptNumber: body.attemptNumber,
          answers: body.answers,
        }),
      );
    case 'submit_attempt_1':
      if (!body.attemptId || !body.answers) {
        return NextResponse.json({ ok: false, error: 'Invalid submit payload' }, { status: 400 });
      }
      {
        const startedAt = Date.now();
        const result = await submitAttemptOneInSupabase({
          studentAppId: student.id,
          attemptAppId: body.attemptId,
          answers: body.answers,
        });
        logStudentAttemptSubmit({
          action: 'submit_attempt_1',
          attemptId: body.attemptId,
          answerCount: body.answers.length,
          ok: result.ok,
          httpStatus: result.ok ? 200 : 400,
          durationMs: Date.now() - startedAt,
          stage: result.ok ? result.data.stage : undefined,
          error: result.ok ? undefined : result.error,
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
    case 'submit_attempt_2':
      if (!body.attemptId || !body.answers) {
        return NextResponse.json({ ok: false, error: 'Invalid submit payload' }, { status: 400 });
      }
      {
        const startedAt = Date.now();
        const result = await submitAttemptTwoInSupabase({
          studentAppId: student.id,
          attemptAppId: body.attemptId,
          answers: body.answers,
        });
        logStudentAttemptSubmit({
          action: 'submit_attempt_2',
          attemptId: body.attemptId,
          answerCount: body.answers.length,
          ok: result.ok,
          httpStatus: result.ok ? 200 : 400,
          durationMs: Date.now() - startedAt,
          stage: result.ok ? result.data.stage : undefined,
          error: result.ok ? undefined : result.error,
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
    default:
      return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }
}
