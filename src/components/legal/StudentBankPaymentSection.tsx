'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  buildConsentPayload,
  PaymentConsentBlock,
  usePaymentConsentState,
} from '@/components/legal/PaymentConsentBlock';
import {
  getBankPaymentUrl,
  isBankPaymentConfigured,
} from '@/lib/legal/payment-config';
import {
  fetchStudentPortalConsents,
  recordStudentPortalConsents,
} from '@/lib/crm/api/student-portal-consents';
import { hasRequiredPaymentConsents } from '@/types/legal-consent';
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';

interface StudentBankPaymentSectionProps {
  studentId: string;
  token: string;
}

export function StudentBankPaymentSection({
  studentId,
  token,
}: StudentBankPaymentSectionProps) {
  const bankUrl = getBankPaymentUrl(studentId);
  const configured = isBankPaymentConfigured(studentId);
  const consent = usePaymentConsentState();
  const [loadingConsents, setLoadingConsents] = useState(true);
  const [consentsGranted, setConsentsGranted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConsents() {
      const result = await fetchStudentPortalConsents(token);
      if (cancelled) {
        return;
      }

      if (result.ok) {
        setConsentsGranted(
          hasRequiredPaymentConsents(
            result.data,
            LEGAL_DOCUMENTS.privacy.version,
            LEGAL_DOCUMENTS.offer.version,
          ),
        );
      }

      setLoadingConsents(false);
    }

    void loadConsents();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleProceedToPayment = useCallback(async () => {
    setError(null);

    if (consentsGranted) {
      if (bankUrl) {
        window.open(bankUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (!consent.validate()) {
      return;
    }

    setSubmitting(true);

    const payload = buildConsentPayload('payment', {
      offer: consent.offerChecked,
      privacy: consent.privacyChecked,
      marketing: consent.marketingChecked,
    });

    const result = await recordStudentPortalConsents(token, { consents: payload });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setConsentsGranted(true);

    if (bankUrl) {
      window.open(bankUrl, '_blank', 'noopener,noreferrer');
    }
  }, [bankUrl, consent, consentsGranted, token]);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-base font-semibold text-white md:text-lg">
        Оплата через банк
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        {configured
          ? 'Перейдите по платёжной ссылке банка для оплаты пакета занятий.'
          : 'Платёжная ссылка банка будет доступна после подключения интернет-эквайринга. Пока можно сообщить об оплате ниже.'}
      </p>

      {!loadingConsents && !consentsGranted ? (
        <div className="mt-4">
          <PaymentConsentBlock
            source="payment"
            offerChecked={consent.offerChecked}
            privacyChecked={consent.privacyChecked}
            marketingChecked={consent.marketingChecked}
            onOfferChange={consent.setOfferChecked}
            onPrivacyChange={consent.setPrivacyChecked}
            onMarketingChange={consent.setMarketingChecked}
            disabled={submitting}
            offerError={consent.offerError}
            privacyError={consent.privacyError}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleProceedToPayment()}
        disabled={!configured || submitting || loadingConsents}
        className="mt-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-sm font-semibold text-white transition enabled:hover:border-[#3166F0] enabled:hover:text-[#3166F0] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {configured ? 'Перейти к оплате' : 'Платёжная ссылка скоро будет доступна'}
      </button>
    </section>
  );
}
