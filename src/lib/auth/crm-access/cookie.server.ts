import 'server-only';

import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import type { CrmAccessRole } from './constants';
import {
  CRM_ACCESS_COOKIE_MAX_AGE_SECONDS,
  CRM_ADMIN_ACCESS_COOKIE_NAME,
  CRM_ASSISTANT_ACCESS_COOKIE_NAME,
} from './constants';

export function getCrmAccessCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: CRM_ACCESS_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  };
}

export function getCrmAccessCookieName(role: CrmAccessRole): string {
  return role === 'admin'
    ? CRM_ADMIN_ACCESS_COOKIE_NAME
    : CRM_ASSISTANT_ACCESS_COOKIE_NAME;
}

/** @deprecated Use getCrmAccessCookieName('admin') */
export function getCrmAccessCookieNameLegacy(): string {
  return CRM_ADMIN_ACCESS_COOKIE_NAME;
}
