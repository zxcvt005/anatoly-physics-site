/**
 * Конфигурация банковской платёжной ссылки.
 *
 * NEXT_PUBLIC_BANK_PAYMENT_URL — общая многоразовая ссылка банка.
 */
export function getBankPaymentUrl(): string | null {
  const globalUrl = process.env.NEXT_PUBLIC_BANK_PAYMENT_URL?.trim();
  if (globalUrl) {
    return globalUrl;
  }

  return null;
}

export const ACCEPTED_PAYMENT_SYSTEMS = ['VISA', 'MasterCard', 'МИР'] as const;
