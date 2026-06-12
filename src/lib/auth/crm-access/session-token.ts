import type { CrmAccessRole } from './constants';
import {
  CRM_ADMIN_SESSION_MARKER,
  CRM_ASSISTANT_SESSION_MARKER,
} from './constants';

function getSessionMarker(role: CrmAccessRole): string {
  return role === 'admin'
    ? CRM_ADMIN_SESSION_MARKER
    : CRM_ASSISTANT_SESSION_MARKER;
}

function bufferToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

async function signSessionMarker(
  password: string,
  role: CrmAccessRole,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(getSessionMarker(role)),
  );

  return bufferToHex(new Uint8Array(signature));
}

export async function createCrmAccessSessionToken(
  password: string,
  role: CrmAccessRole,
): Promise<string> {
  return signSessionMarker(password, role);
}

export async function isValidCrmAccessSessionToken(
  password: string | undefined,
  token: string | undefined,
  role: CrmAccessRole,
): Promise<boolean> {
  if (!password || !token) {
    return false;
  }

  const expected = await createCrmAccessSessionToken(password, role);
  return timingSafeEqualHex(expected, token);
}
