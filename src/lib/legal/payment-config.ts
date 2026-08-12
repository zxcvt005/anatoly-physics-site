/**
 * Конфигурация банковской платёжной ссылки.
 * URL будет добавлен после одобрения интернет-эквайринга.
 *
 * Переменная окружения (опционально):
 * NEXT_PUBLIC_BANK_PAYMENT_URL — общая многоразовая ссылка (если банк выдаст одну на проект)
 *
 * TODO: per-student URLs из Supabase, когда банк предоставит индивидуальные ссылки.
 */
export function getBankPaymentUrl(_studentAppId?: string): string | null {
  const globalUrl = process.env.NEXT_PUBLIC_BANK_PAYMENT_URL?.trim();
  if (globalUrl) {
    return globalUrl;
  }

  return null;
}

export function isBankPaymentConfigured(studentAppId?: string): boolean {
  return getBankPaymentUrl(studentAppId) !== null;
}

export const ACCEPTED_PAYMENT_SYSTEMS = ['VISA', 'MasterCard', 'МИР'] as const;
