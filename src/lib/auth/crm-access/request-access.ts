import type { NextRequest } from 'next/server';
import {
  CRM_ADMIN_ACCESS_COOKIE_NAME,
  CRM_ASSISTANT_ACCESS_COOKIE_NAME,
} from './constants';
import {
  getAdminAccessPassword,
  getAssistantAccessPassword,
} from './password';
import { isValidCrmAccessSessionToken } from './session-token';

export async function hasAdminAccess(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(CRM_ADMIN_ACCESS_COOKIE_NAME)?.value;
  return isValidCrmAccessSessionToken(
    getAdminAccessPassword(),
    token,
    'admin',
  );
}

export async function hasAssistantCookieAccess(
  request: NextRequest,
): Promise<boolean> {
  const token = request.cookies.get(CRM_ASSISTANT_ACCESS_COOKIE_NAME)?.value;
  return isValidCrmAccessSessionToken(
    getAssistantAccessPassword(),
    token,
    'assistant',
  );
}

export async function canAccessAssistantArea(
  request: NextRequest,
): Promise<boolean> {
  return (await hasAdminAccess(request)) || (await hasAssistantCookieAccess(request));
}

const ASSISTANT_ALLOWED_CRM_API = new Set([
  '/api/crm/students',
  '/api/crm/schedule-slots',
]);

function isTestsCrmApiPath(pathname: string): boolean {
  return (
    pathname === '/api/crm/tests/topics' ||
    pathname.startsWith('/api/crm/tests/topics/') ||
    pathname === '/api/crm/tests/sections' ||
    pathname.startsWith('/api/crm/tests/sections/') ||
    pathname.startsWith('/api/crm/tests/intensives/') ||
    pathname === '/api/crm/tests/assignments'
  );
}

function isIntensivesCrmApiPath(pathname: string): boolean {
  return (
    pathname === '/api/crm/intensives' ||
    pathname.startsWith('/api/crm/intensives/')
  );
}

function isLessonsCrmApiPath(pathname: string): boolean {
  return (
    pathname === '/api/crm/lessons' ||
    pathname.startsWith('/api/crm/lessons/')
  );
}

export function isAssistantAllowedCrmApiRequest(
  method: string,
  pathname: string,
): boolean {
  if (isIntensivesCrmApiPath(pathname) || isLessonsCrmApiPath(pathname) || isTestsCrmApiPath(pathname)) {
    return true;
  }

  if (method !== 'GET') {
    return false;
  }

  return ASSISTANT_ALLOWED_CRM_API.has(pathname);
}
