import { NextResponse } from 'next/server';
import { memeBattleFailure } from '@/lib/meme-battle/api-response';
import { MEME_BATTLE_MAX_BYTES } from '@/lib/meme-battle/constants';
import { resolveMemeStudent, uploadMemeImage } from '@/lib/meme-battle/repository.server';

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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return memeBattleFailure('invalid_file');
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size <= 0 || file.size > MEME_BATTLE_MAX_BYTES) {
    return memeBattleFailure('invalid_file');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploaded = await uploadMemeImage(student.studentId, bytes);
  if (!uploaded.ok) return memeBattleFailure(uploaded.code, uploaded.error);

  return NextResponse.json({ ok: true, data: uploaded.data });
}
