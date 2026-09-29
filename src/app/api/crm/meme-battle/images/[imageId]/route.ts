import { NextResponse } from 'next/server';
import { isCrmAdminAuthenticated } from '@/lib/auth/crm-access/guard.server';
import { memeBattleFailure } from '@/lib/meme-battle/api-response';
import { adminHideMemeImage } from '@/lib/meme-battle/repository.server';

type RouteContext = { params: Promise<{ imageId: string }> };

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isCrmAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { imageId } = await context.params;
  const hidden = await adminHideMemeImage(imageId);
  if (!hidden.ok) return memeBattleFailure(hidden.code, hidden.error);
  return NextResponse.json({ ok: true, data: hidden.data });
}
