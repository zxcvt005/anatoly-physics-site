import { NextResponse } from 'next/server';
import { memeBattleFailure } from '@/lib/meme-battle/api-response';
import { openOrCreateMemeRound, resolveMemeStudent } from '@/lib/meme-battle/repository.server';

type RouteContext = { params: Promise<{ token: string }> };

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const student = await resolveMemeStudent(token);
  if (!student.ok) {
    return NextResponse.json(
      { ok: false, error: student.error },
      { status: student.status },
    );
  }

  const url = new URL(request.url);
  if (url.searchParams.has('studentId')) {
    return memeBattleFailure('invalid_places');
  }

  const round = await openOrCreateMemeRound(student.studentId);
  if (!round.ok) return memeBattleFailure(round.code, round.error);
  return NextResponse.json({ ok: true, data: round.data });
}
