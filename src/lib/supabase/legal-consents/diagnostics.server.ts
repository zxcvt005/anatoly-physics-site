import 'server-only';

import type { PostgrestError } from '@supabase/supabase-js';
import type { LegalConsentSource, LegalConsentType } from '@/types/legal-consent';

interface LegalConsentInsertLog {
  studentAppId?: string;
  consentTypes: LegalConsentType[];
  documentVersions: string[];
  source?: LegalConsentSource;
  ok: boolean;
  supabaseCode?: string;
  supabaseMessage?: string;
  supabaseDetails?: string;
  error?: string;
}

export function logLegalConsentInsert(payload: LegalConsentInsertLog): void {
  console.info('[legal-consents:insert]', payload);
}

export function logLegalConsentInsertFailure(input: {
  studentAppId?: string;
  consents: Array<{
    consentType: LegalConsentType;
    documentVersion: string;
    source: LegalConsentSource;
  }>;
  error: PostgrestError | { message: string; code?: string; details?: string };
}): void {
  logLegalConsentInsert({
    studentAppId: input.studentAppId,
    consentTypes: input.consents.map((consent) => consent.consentType),
    documentVersions: input.consents.map((consent) => consent.documentVersion),
    source: input.consents[0]?.source,
    ok: false,
    supabaseCode: 'code' in input.error ? input.error.code : undefined,
    supabaseMessage: input.error.message,
    supabaseDetails:
      'details' in input.error ? (input.error.details ?? undefined) : undefined,
  });
}
