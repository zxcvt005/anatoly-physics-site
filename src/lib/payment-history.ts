import { formatMonthKeyLabel } from '@/lib/revenue-calculations';
import type { Payment, PaymentStatus } from '@/types/tutor';

export interface PaymentMonthSummary {
  confirmed: number;
  pending: number;
  rejected: number;
}

export interface PaymentMonthGroup {
  monthKey: string;
  label: string;
  summary: PaymentMonthSummary;
  payments: Payment[];
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждена',
  rejected: 'Отклонена',
};

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  'pending',
  'confirmed',
  'rejected',
];

export function buildPaymentHistoryGroups(payments: Payment[]): PaymentMonthGroup[] {
  const byMonth = new Map<string, Payment[]>();

  for (const payment of payments) {
    const monthKey = payment.createdAt.slice(0, 7);
    const list = byMonth.get(monthKey) ?? [];
    list.push(payment);
    byMonth.set(monthKey, list);
  }

  return [...byMonth.entries()]
    .sort(([monthKeyA], [monthKeyB]) => monthKeyB.localeCompare(monthKeyA))
    .map(([monthKey, monthPayments]) => {
      const sorted = [...monthPayments].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const summary = sorted.reduce<PaymentMonthSummary>(
        (acc, payment) => {
          acc[payment.status] += payment.amount;
          return acc;
        },
        { confirmed: 0, pending: 0, rejected: 0 },
      );

      return {
        monthKey,
        label: formatMonthKeyLabel(monthKey),
        summary,
        payments: sorted,
      };
    });
}
