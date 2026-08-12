export type LegalConsentType = 'privacy' | 'offer' | 'marketing';

export type LegalConsentSource =
  | 'payment'
  | 'payment_report'
  | 'form';

export interface LegalConsentRecord {
  consentType: LegalConsentType;
  documentVersion: string;
  grantedAt: string;
  source: LegalConsentSource;
}

export interface StudentLegalConsentsSnapshot {
  privacy: LegalConsentRecord | null;
  offer: LegalConsentRecord | null;
  marketing: LegalConsentRecord | null;
}

export interface RecordLegalConsentInput {
  consentType: LegalConsentType;
  documentVersion: string;
  source: LegalConsentSource;
  contextRef?: string;
}

export interface RecordLegalConsentsRequest {
  consents: RecordLegalConsentInput[];
}

export function isConsentValidForVersion(
  record: LegalConsentRecord | null | undefined,
  requiredVersion: string,
): boolean {
  return Boolean(record && record.documentVersion === requiredVersion);
}

export function hasRequiredPaymentConsents(
  snapshot: StudentLegalConsentsSnapshot,
  privacyVersion: string,
  offerVersion: string,
): boolean {
  return (
    isConsentValidForVersion(snapshot.privacy, privacyVersion) &&
    isConsentValidForVersion(snapshot.offer, offerVersion)
  );
}
