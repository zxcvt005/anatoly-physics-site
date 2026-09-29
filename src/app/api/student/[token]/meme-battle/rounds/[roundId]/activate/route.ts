import { NextResponse } from 'next/server';
import { memeBattleFailure } from '@/lib/meme-battle/api-response';
import { activatePreparedMemeRound, resolveMemeStudent } from '@/lib/meme-battle/repository.server';

type RouteContext = { params: Promise<{ token: string; roundId: string }> };

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: RouteContext) {
  const { token, roundId } = await context.params;
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

  const activated = await activatePreparedMemeRound(student.studentId, roundId);
  if (!activated.ok) return memeBattleFailure(activated.code, activated.error);
  return NextResponse.json({ ok: true });
}
