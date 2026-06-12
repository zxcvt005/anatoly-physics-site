import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import {
  getAdminAccessPassword,
  getAssistantAccessPassword,
} from './password';

export { getAdminAccessPassword, getAssistantAccessPassword };

function verifyPassword(input: string, expected: string | undefined): boolean {
  if (!expected) {
    return false;
  }

  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

export function verifyAdminAccessPassword(input: string): boolean {
  return verifyPassword(input, getAdminAccessPassword());
}

export function verifyAssistantAccessPassword(input: string): boolean {
  return verifyPassword(input, getAssistantAccessPassword());
}
