import { NextResponse } from 'next/server';
import { memeBattleFailure } from '@/lib/meme-battle/api-response';
import {
  deactivateOwnedMemeImage,
  resolveMemeStudent,
} from '@/lib/meme-battle/repository.server';

type RouteContext = { params: Promise<{ token: string; imageId: string }> };

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, context: RouteContext) {
  const { token, imageId } = await context.params;
  const student = await resolveMemeStudent(token);
  if (!student.ok) {
    return NextResponse.json(
      { ok: false, error: student.error },
      { status: student.status },
    );
  }

  const removed = await deactivateOwnedMemeImage(student.studentId, imageId);
  if (!removed.ok) return memeBattleFailure(removed.code, removed.error);
  return NextResponse.json({ ok: true, data: removed.data });
}
