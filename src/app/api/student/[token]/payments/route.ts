import { NextResponse } from 'next/server';
import { createStudentPortalPendingPayment } from '@/lib/student-portal/repository.server';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const body = (await request.json()) as {
    id?: string;
    amount?: number;
    note?: string;
    studentId?: string;
    status?: string;
  };

  if (body.studentId !== undefined) {
    return NextResponse.json(
      { ok: false, error: 'studentId is not allowed' },
      { status: 400 },
    );
  }

  if (body.status !== undefined && body.status !== 'pending') {
    return NextResponse.json(
      { ok: false, error: 'Only pending payments can be created from student portal' },
      { status: 400 },
    );
  }

  if (!body.id || body.amount === undefined) {
    return NextResponse.json(
      { ok: false, error: 'Missing id or amount' },
      { status: 400 },
    );
  }

  const result = await createStudentPortalPendingPayment(token, {
    id: body.id,
    amount: body.amount,
    note: body.note,
  });

  if (!result.ok) {
    const status = result.error === 'Student not found' ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
