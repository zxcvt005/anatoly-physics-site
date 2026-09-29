import { NextResponse } from 'next/server';
import { memeBattleFailure } from '@/lib/meme-battle/api-response';
import { resolveMemeStudent, submitMemeRound } from '@/lib/meme-battle/repository.server';
import type { MemePlacement } from '@/lib/meme-battle/types';

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

  let body: { placements?: MemePlacement[] };
  try {
    body = (await request.json()) as { placements?: MemePlacement[] };
  } catch {
    return memeBattleFailure('invalid_places');
  }

  if (!Array.isArray(body.placements)) return memeBattleFailure('invalid_places');

  const submitted = await submitMemeRound(student.studentId, roundId, body.placements);
  if (!submitted.ok) return memeBattleFailure(submitted.code, submitted.error);
  return NextResponse.json({ ok: true, data: submitted.data });
}
