import type {
  RecordLegalConsentsRequest,
  StudentLegalConsentsSnapshot,
} from '@/types/legal-consent';
import { crmApiGet, crmApiPost } from './http';

function consentsBase(token: string): string {
  return `/api/student/${encodeURIComponent(token)}/consents`;
}

export async function fetchStudentPortalConsents(
  token: string,
): Promise<
  | { ok: true; data: StudentLegalConsentsSnapshot }
  | { ok: false; error: string }
> {
  return crmApiGet<StudentLegalConsentsSnapshot>(consentsBase(token));
}

export async function recordStudentPortalConsents(
  token: string,
  body: RecordLegalConsentsRequest,
): Promise<
  | { ok: true; data: StudentLegalConsentsSnapshot }
  | { ok: false; error: string }
> {
  return crmApiPost<StudentLegalConsentsSnapshot>(consentsBase(token), body);
}
