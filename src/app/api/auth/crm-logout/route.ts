import { NextResponse } from 'next/server';
import type { CrmAccessRole } from '@/lib/auth/crm-access/constants';
import { getCrmAccessCookieName } from '@/lib/auth/crm-access/cookie.server';

function parseRole(value: unknown): CrmAccessRole | null {
  if (value === 'admin' || value === 'assistant') {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { role?: CrmAccessRole };
  const role = parseRole(body.role);

  if (!role) {
    return NextResponse.json(
      { ok: false, error: 'Некорректная роль выхода' },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getCrmAccessCookieName(role), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });

  return response;
}
