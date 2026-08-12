'use client';

import { useEffect, useState } from 'react';
import { CollapsiblePanel } from '@/components/tutor/CollapsiblePanel';
import {
  buildConsentPayload,
  PaymentConsentBlock,
  usePaymentConsentState,
} from '@/components/legal/PaymentConsentBlock';
import { fetchStudentPortalConsents } from '@/lib/crm/api/student-portal-consents';
import { formatMoney } from '@/lib/tutor-calculations';
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';
import { hasRequiredPaymentConsents } from '@/types/legal-consent';
import { usePayments } from '@/providers/PaymentsProvider';

interface AddPaymentFormProps {
  studentId: string;
  studentName: string;
  studentPortalToken: string;
  amountPresets?: number[];
}

export function AddPaymentForm({
  studentId,
  studentName,
  studentPortalToken,
  amountPresets = [],
}: AddPaymentFormProps) {
  const { addPendingPayment } = usePayments();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loadingConsents, setLoadingConsents] = useState(true);
  const [consentsGranted, setConsentsGranted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const consent = usePaymentConsentState();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    async function loadConsents() {
      setLoadingConsents(true);
      const result = await fetchStudentPortalConsents(studentPortalToken);

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
  }, [isOpen, studentPortalToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const parsed = Number(amount);

    if (!parsed || parsed <= 0) {
      alert('Введите корректную сумму');
      return;
    }

    let consentsPayload;

    if (!consentsGranted) {
      if (!consent.validate()) {
        return;
      }

      consentsPayload = buildConsentPayload('payment_report', {
        offer: consent.offerChecked,
        privacy: consent.privacyChecked,
        marketing: consent.marketingChecked,
      });
    }

    const result = await addPendingPayment({
      studentId,
      amount: parsed,
      note: note.trim() || undefined,
      consents: consentsPayload,
    });

    if (!result.ok) {
      setSubmitError(result.error ?? 'Не удалось отправить сообщение об оплате');
      return;
    }

    setConsentsGranted(true);
    setAmount('');
    setNote('');
    consent.reset();
    setIsOpen(false);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(/\D/g, ''));
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3166F0] px-6 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(49,102,240,0.35)] transition hover:scale-[1.01] hover:bg-[#2858d4]"
      >
        <span className="text-xl leading-none">+</span>
        Сообщить об оплате
      </button>

      <CollapsiblePanel open={isOpen}>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-5"
        >
          <p className="mb-4 text-sm text-zinc-500">
            {studentName ? `Ученик: ${studentName}` : null}
          </p>

          {!loadingConsents && !consentsGranted ? (
            <div className="mb-4">
              <PaymentConsentBlock
                source="payment_report"
                offerChecked={consent.offerChecked}
                privacyChecked={consent.privacyChecked}
                marketingChecked={consent.marketingChecked}
                onOfferChange={consent.setOfferChecked}
                onPrivacyChange={consent.setPrivacyChecked}
                onMarketingChange={consent.setMarketingChecked}
                offerError={consent.offerError}
                privacyError={consent.privacyError}
              />
            </div>
          ) : null}

          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Сумма оплаты, ₽
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="10000"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[#3166F0]"
            autoFocus={isOpen}
          />

          {amountPresets.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {amountPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-white xl:text-sm"
                >
                  {formatMoney(preset)}
                </button>
              ))}
            </div>
          )}

          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Комментарий
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Например: перевод на карту"
            className="mb-4 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-[#3166F0]"
          />

          {submitError ? (
            <p className="mb-4 text-sm text-red-400" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={loadingConsents}
              className="flex-1 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Отправить
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setAmount('');
                setNote('');
                setSubmitError(null);
                consent.reset();
              }}
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-400 transition hover:text-white"
            >
              Отмена
            </button>
          </div>
        </form>
      </CollapsiblePanel>
    </div>
  );
}
