import { NextResponse } from 'next/server';
import { fetchStudentPortalDataByToken } from '@/lib/student-portal/repository.server';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const result = await fetchStudentPortalDataByToken(token);

  if (!result.ok) {
    const status = result.error === 'Student not found' ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
