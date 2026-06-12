import 'server-only';

import { cookies } from 'next/headers';
import {
  CRM_ADMIN_ACCESS_COOKIE_NAME,
  CRM_ASSISTANT_ACCESS_COOKIE_NAME,
} from './constants';
import {
  getAdminAccessPassword,
  getAssistantAccessPassword,
} from './password.server';
import { isValidCrmAccessSessionToken } from './session-token';

export async function isCrmAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CRM_ADMIN_ACCESS_COOKIE_NAME)?.value;

  return isValidCrmAccessSessionToken(
    getAdminAccessPassword(),
    token,
    'admin',
  );
}

export async function isCrmAssistantAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CRM_ASSISTANT_ACCESS_COOKIE_NAME)?.value;

  return isValidCrmAccessSessionToken(
    getAssistantAccessPassword(),
    token,
    'assistant',
  );
}
