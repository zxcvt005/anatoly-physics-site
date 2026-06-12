import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CRM_LOGIN_PATH } from '@/lib/auth/crm-access/constants';
import {
  canAccessAssistantArea,
  hasAdminAccess,
  hasAssistantCookieAccess,
  isAssistantAllowedCrmApiRequest,
} from '@/lib/auth/crm-access/request-access';

function redirectToLogin(request: NextRequest, nextPath: string) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = CRM_LOGIN_PATH;
  loginUrl.searchParams.set('next', nextPath);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/crm')) {
    if (await hasAdminAccess(request)) {
      return NextResponse.next();
    }

    if (await hasAssistantCookieAccess(request)) {
      if (isAssistantAllowedCrmApiRequest(request.method, pathname)) {
        return NextResponse.next();
      }

      return NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  if (pathname.startsWith('/admin')) {
    if (!(await hasAdminAccess(request))) {
      return redirectToLogin(request, pathname);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith('/assistant')) {
    if (!(await canAccessAssistantArea(request))) {
      return redirectToLogin(request, pathname);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/assistant/:path*', '/api/crm/:path*'],
};
