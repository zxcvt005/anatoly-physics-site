import assert from 'node:assert/strict';
import { resolveLegalConsentsApiStatus } from '../src/lib/legal/consent-api-status';
import {
  getRequiredDocumentVersion,
  validateConsentInput,
  validatePaymentReportConsents,
  validatePaymentConsents,
} from '../src/lib/legal/consent-validation';
import { LEGAL_DOCUMENTS } from '../src/lib/legal/documents';
import {
  SUPABASE_SERVICE_ROLE_KEY_ENV,
  SUPABASE_SERVICE_ROLE_MISSING_MESSAGE,
  resolveServiceRoleKeyFromEnv,
} from '../src/lib/supabase/service-role-env';
import {
  hasRequiredPaymentConsents,
  isConsentValidForVersion,
} from '../src/types/legal-consent';

function runServiceRoleEnvChecks() {
  assert.equal(
    resolveServiceRoleKeyFromEnv({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'anon-key-only',
      SUPABASE_URL: 'https://example.supabase.co',
    }),
    undefined,
    'publishable key must not be used as service role fallback',
  );

  assert.equal(
    resolveServiceRoleKeyFromEnv({
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    }),
    'service-role-key',
  );

  assert.equal(
    resolveServiceRoleKeyFromEnv({
      SUPABASE_SECRET_KEY: 'legacy-secret-key',
    }),
    'legacy-secret-key',
  );

  assert.equal(
    resolveLegalConsentsApiStatus(SUPABASE_SERVICE_ROLE_MISSING_MESSAGE),
    503,
  );

  assert.equal(SUPABASE_SERVICE_ROLE_KEY_ENV, 'SUPABASE_SERVICE_ROLE_KEY');
}

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

runServiceRoleEnvChecks();
runLegalConsentChecks();
