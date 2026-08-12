'use client';

import { useId, useState } from 'react';
import { MarketingConsentCheckbox } from '@/components/legal/MarketingConsentCheckbox';
import { OfferConsentCheckbox } from '@/components/legal/OfferConsentCheckbox';
import { PrivacyConsentCheckbox } from '@/components/legal/PrivacyConsentCheckbox';
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';
import type { LegalConsentSource } from '@/types/legal-consent';
import type { RecordLegalConsentInput } from '@/types/legal-consent';

interface PaymentConsentBlockProps {
  source: Extract<LegalConsentSource, 'payment' | 'payment_report'>;
  offerChecked: boolean;
  privacyChecked: boolean;
  marketingChecked: boolean;
  onOfferChange: (checked: boolean) => void;
  onPrivacyChange: (checked: boolean) => void;
  onMarketingChange: (checked: boolean) => void;
  disabled?: boolean;
  showMarketing?: boolean;
  offerError?: string | null;
  privacyError?: string | null;
}

export function PaymentConsentBlock({
  source,
  offerChecked,
  privacyChecked,
  marketingChecked,
  onOfferChange,
  onPrivacyChange,
  onMarketingChange,
  disabled = false,
  showMarketing = true,
  offerError = null,
  privacyError = null,
}: PaymentConsentBlockProps) {
  const baseId = useId();

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-sm font-medium text-zinc-300">
        Перед оплатой подтвердите согласия
      </p>

      <OfferConsentCheckbox
        id={`${baseId}-offer`}
        checked={offerChecked}
        onChange={onOfferChange}
        disabled={disabled}
        error={offerError}
      />

      <PrivacyConsentCheckbox
        id={`${baseId}-privacy`}
        checked={privacyChecked}
        onChange={onPrivacyChange}
        disabled={disabled}
        error={privacyError}
      />

      {showMarketing ? (
        <MarketingConsentCheckbox
          id={`${baseId}-marketing`}
          checked={marketingChecked}
          onChange={onMarketingChange}
          disabled={disabled}
        />
      ) : null}

      <p className="text-xs leading-relaxed text-zinc-500">
        Источник подтверждения: {source === 'payment' ? 'оплата' : 'сообщение об оплате'}.
        Версии документов: оферта {LEGAL_DOCUMENTS.offer.version}, политика{' '}
        {LEGAL_DOCUMENTS.privacy.version}.
      </p>
    </div>
  );
}

export function buildConsentPayload(
  source: Extract<LegalConsentSource, 'payment' | 'payment_report'>,
  options: {
    offer: boolean;
    privacy: boolean;
    marketing: boolean;
    contextRef?: string;
  },
): RecordLegalConsentInput[] {
  const consents: RecordLegalConsentInput[] = [];

  if (options.privacy) {
    consents.push({
      consentType: 'privacy',
      documentVersion: LEGAL_DOCUMENTS.privacy.version,
      source,
      contextRef: options.contextRef,
    });
  }

  if (options.offer) {
    consents.push({
      consentType: 'offer',
      documentVersion: LEGAL_DOCUMENTS.offer.version,
      source,
      contextRef: options.contextRef,
    });
  }

  if (options.marketing) {
    consents.push({
      consentType: 'marketing',
      documentVersion: LEGAL_DOCUMENTS.marketingConsent.version,
      source,
      contextRef: options.contextRef,
    });
  }

  return consents;
}

export function usePaymentConsentState(initialGranted = false) {
  const [offerChecked, setOfferChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [alreadyGranted] = useState(initialGranted);

  const validate = (): boolean => {
    let valid = true;

    if (!offerChecked) {
      setOfferError('Необходимо согласие с условиями оферты');
      valid = false;
    } else {
      setOfferError(null);
    }

    if (!privacyChecked) {
      setPrivacyError('Необходимо согласие на обработку персональных данных');
      valid = false;
    } else {
      setPrivacyError(null);
    }

    return valid;
  };

  const reset = () => {
    setOfferChecked(false);
    setPrivacyChecked(false);
    setMarketingChecked(false);
    setOfferError(null);
    setPrivacyError(null);
  };

  return {
    offerChecked,
    privacyChecked,
    marketingChecked,
    offerError,
    privacyError,
    alreadyGranted,
    setOfferChecked,
    setPrivacyChecked,
    setMarketingChecked,
    validate,
    reset,
  };
}
