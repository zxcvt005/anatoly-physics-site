import { NextResponse } from 'next/server';
import type { CrmAccessRole } from '@/lib/auth/crm-access/constants';
import {
  getCrmAccessCookieName,
  getCrmAccessCookieOptions,
} from '@/lib/auth/crm-access/cookie.server';
import {
  getAdminAccessPassword,
  getAssistantAccessPassword,
  verifyAdminAccessPassword,
  verifyAssistantAccessPassword,
} from '@/lib/auth/crm-access/password.server';
import { createCrmAccessSessionToken } from '@/lib/auth/crm-access/session-token';

function parseRole(value: unknown): CrmAccessRole | null {
  if (value === 'admin' || value === 'assistant') {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    password?: string;
    role?: CrmAccessRole;
  };

  const role = parseRole(body.role);

  if (!body.password) {
    return NextResponse.json(
      { ok: false, error: 'Введите пароль' },
      { status: 400 },
    );
  }

  if (!role) {
    return NextResponse.json(
      { ok: false, error: 'Некорректная роль входа' },
      { status: 400 },
    );
  }

  if (role === 'admin' && !getAdminAccessPassword()) {
    return NextResponse.json(
      { ok: false, error: 'Пароль админки не настроен' },
      { status: 503 },
    );
  }

  if (role === 'assistant' && !getAssistantAccessPassword()) {
    return NextResponse.json(
      { ok: false, error: 'Пароль ассистентки не настроен' },
      { status: 503 },
    );
  }

  const isValidPassword =
    role === 'admin'
      ? verifyAdminAccessPassword(body.password)
      : verifyAssistantAccessPassword(body.password);

  if (!isValidPassword) {
    return NextResponse.json(
      { ok: false, error: 'Неверный пароль' },
      { status: 401 },
    );
  }

  const token = await createCrmAccessSessionToken(body.password, role);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    getCrmAccessCookieName(role),
    token,
    getCrmAccessCookieOptions(),
  );

  return response;
}
