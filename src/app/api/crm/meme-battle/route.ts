import { NextResponse } from 'next/server';
import { isCrmAdminAuthenticated } from '@/lib/auth/crm-access/guard.server';
import { memeBattleFailure } from '@/lib/meme-battle/api-response';
import { fetchAdminMemeGallery } from '@/lib/meme-battle/repository.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isCrmAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const gallery = await fetchAdminMemeGallery();
  if (!gallery.ok) return memeBattleFailure(gallery.code, gallery.error);
  return NextResponse.json({ ok: true, data: gallery.data });
}
