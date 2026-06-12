import type { Payment } from '@/types/tutor';

export const PAYMENTS_STORAGE_KEY = 'tutor-payments-mock-v1';

function sortPaymentsDesc(payments: Payment[]): Payment[] {
  return [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function readPaymentsFromLocalStorage(fallback: Payment[]): Payment[] {
  if (typeof window === 'undefined') {
    return sortPaymentsDesc(fallback);
  }

  const stored = localStorage.getItem(PAYMENTS_STORAGE_KEY);
  if (!stored) {
    return sortPaymentsDesc(fallback);
  }

  try {
    return sortPaymentsDesc(JSON.parse(stored) as Payment[]);
  } catch {
    return sortPaymentsDesc(fallback);
  }
}

export function writePaymentsToLocalStorage(payments: Payment[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
}
