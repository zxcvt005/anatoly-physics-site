import assert from 'node:assert/strict';
import {
  getRequiredDocumentVersion,
  validateConsentInput,
  validatePaymentReportConsents,
  validatePaymentConsents,
} from '../src/lib/legal/consent-validation';
import { LEGAL_DOCUMENTS } from '../src/lib/legal/documents';
import {
  hasRequiredPaymentConsents,
  isConsentValidForVersion,
} from '../src/types/legal-consent';

function runLegalConsentChecks() {
  assert.equal(getRequiredDocumentVersion('privacy'), LEGAL_DOCUMENTS.privacy.version);
  assert.equal(getRequiredDocumentVersion('offer'), LEGAL_DOCUMENTS.offer.version);

  assert.equal(
    validateConsentInput({
      consentType: 'privacy',
      documentVersion: LEGAL_DOCUMENTS.privacy.version,
      source: 'payment_report',
    }),
    null,
  );

  assert.equal(
    validateConsentInput({
      consentType: 'privacy',
      documentVersion: 'wrong-version',
      source: 'payment_report',
    }),
    'Invalid document version for privacy',
  );

  assert.equal(
    validatePaymentReportConsents([
      {
        consentType: 'privacy',
        documentVersion: LEGAL_DOCUMENTS.privacy.version,
        source: 'payment_report',
      },
      {
        consentType: 'offer',
        documentVersion: LEGAL_DOCUMENTS.offer.version,
        source: 'payment_report',
      },
    ]),
    null,
  );

  assert.equal(
    validatePaymentReportConsents([
      {
        consentType: 'privacy',
        documentVersion: LEGAL_DOCUMENTS.privacy.version,
        source: 'payment_report',
      },
    ]),
    'Offer consent is required',
  );

  assert.equal(
    validatePaymentConsents([
      {
        consentType: 'privacy',
        documentVersion: LEGAL_DOCUMENTS.privacy.version,
        source: 'payment',
      },
      {
        consentType: 'offer',
        documentVersion: LEGAL_DOCUMENTS.offer.version,
        source: 'payment',
      },
    ]),
    null,
  );

  const snapshot = {
    privacy: {
      consentType: 'privacy' as const,
      documentVersion: LEGAL_DOCUMENTS.privacy.version,
      source: 'payment_report' as const,
      grantedAt: new Date().toISOString(),
    },
    offer: {
      consentType: 'offer' as const,
      documentVersion: LEGAL_DOCUMENTS.offer.version,
      source: 'payment_report' as const,
      grantedAt: new Date().toISOString(),
    },
    marketing: null,
  };

  assert.equal(
    isConsentValidForVersion(snapshot.privacy, LEGAL_DOCUMENTS.privacy.version),
    true,
  );
  assert.equal(
    hasRequiredPaymentConsents(
      snapshot,
      LEGAL_DOCUMENTS.privacy.version,
      LEGAL_DOCUMENTS.offer.version,
    ),
    true,
  );

  console.log('verify:legal-consents OK');
}

runLegalConsentChecks();
