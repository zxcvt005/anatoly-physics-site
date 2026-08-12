import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';
import type {
  LegalConsentSource,
  LegalConsentType,
  RecordLegalConsentInput,
  StudentLegalConsentsSnapshot,
} from '@/types/legal-consent';

const VALID_CONSENT_TYPES = new Set<LegalConsentType>([
  'privacy',
  'offer',
  'marketing',
]);

const VALID_CONSENT_SOURCES = new Set<LegalConsentSource>([
  'payment',
  'payment_report',
  'form',
]);

const REQUIRED_VERSIONS: Record<LegalConsentType, string> = {
  privacy: LEGAL_DOCUMENTS.privacy.version,
  offer: LEGAL_DOCUMENTS.offer.version,
  marketing: LEGAL_DOCUMENTS.marketingConsent.version,
};

export function getRequiredDocumentVersion(
  consentType: LegalConsentType,
): string {
  return REQUIRED_VERSIONS[consentType];
}

export function validateConsentInput(
  input: RecordLegalConsentInput,
): string | null {
  if (!VALID_CONSENT_TYPES.has(input.consentType)) {
    return 'Invalid consent type';
  }

  if (!VALID_CONSENT_SOURCES.has(input.source)) {
    return 'Invalid consent source';
  }

  const requiredVersion = getRequiredDocumentVersion(input.consentType);
  if (input.documentVersion !== requiredVersion) {
    return `Invalid document version for ${input.consentType}`;
  }

  if (input.contextRef && input.contextRef.length > 200) {
    return 'contextRef is too long';
  }

  return null;
}

export function validatePaymentReportConsents(
  consents: RecordLegalConsentInput[],
): string | null {
  const privacy = consents.find((item) => item.consentType === 'privacy');
  const offer = consents.find((item) => item.consentType === 'offer');

  if (!privacy) {
    return 'Privacy consent is required';
  }

  if (!offer) {
    return 'Offer consent is required';
  }

  for (const consent of consents) {
    const error = validateConsentInput(consent);
    if (error) {
      return error;
    }

    if (
      consent.consentType === 'privacy' &&
      consent.source !== 'payment_report'
    ) {
      return 'Privacy consent source must be payment_report';
    }

    if (
      consent.consentType === 'offer' &&
      consent.source !== 'payment_report'
    ) {
      return 'Offer consent source must be payment_report';
    }
  }

  return null;
}

export function validatePaymentConsents(
  consents: RecordLegalConsentInput[],
): string | null {
  const privacy = consents.find((item) => item.consentType === 'privacy');
  const offer = consents.find((item) => item.consentType === 'offer');

  if (!privacy || !offer) {
    return 'Offer and privacy consents are required';
  }

  for (const consent of consents) {
    const error = validateConsentInput(consent);
    if (error) {
      return error;
    }

    if (consent.source !== 'payment') {
      return 'Payment consents must use payment source';
    }
  }

  return null;
}

export function snapshotHasRequiredPaymentConsents(
  snapshot: StudentLegalConsentsSnapshot,
): boolean {
  return (
    snapshot.privacy?.documentVersion === REQUIRED_VERSIONS.privacy &&
    snapshot.offer?.documentVersion === REQUIRED_VERSIONS.offer
  );
}
