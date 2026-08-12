import type { StudentLegalConsentsSnapshot } from '@/types/legal-consent';

export type LegalConsentsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type { StudentLegalConsentsSnapshot };
