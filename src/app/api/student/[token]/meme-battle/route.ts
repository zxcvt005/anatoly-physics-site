import { NextResponse } from 'next/server';
import { memeBattleFailure } from '@/lib/meme-battle/api-response';
import { fetchMemeBattleOverview, resolveMemeStudent } from '@/lib/meme-battle/repository.server';

type RouteContext = { params: Promise<{ token: string }> };

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const student = await resolveMemeStudent(token);
  if (!student.ok) {
    return NextResponse.json(
      { ok: false, error: student.error },
      { status: student.status },
    );
  }

  const overview = await fetchMemeBattleOverview(student.studentId);
  if (!overview.ok) return memeBattleFailure(overview.code, overview.error);
  return NextResponse.json({ ok: true, data: overview.data });
}
