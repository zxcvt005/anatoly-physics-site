import type { Payment, PaymentStatus } from '@/types/tutor';
import type { PaymentsRepositoryResult } from '@/lib/supabase/payments/types';
import { crmApiGet, crmApiPatch, crmApiPost } from './http';

const BASE = '/api/crm/payments';

export async function fetchPaymentsFromSupabase(): Promise<
  PaymentsRepositoryResult<Payment[]>
> {
  return crmApiGet<Payment[]>(BASE);
}

export async function insertPaymentToSupabase(
  payment: Payment,
): Promise<PaymentsRepositoryResult<Payment>> {
  return crmApiPost<Payment>(BASE, { payment });
}

export async function updatePaymentStatusInSupabase(
  paymentAppId: string,
  status: PaymentStatus,
): Promise<PaymentsRepositoryResult<Payment>> {
  return crmApiPatch<Payment>(`${BASE}/${encodeURIComponent(paymentAppId)}`, {
    status,
  });
}

export async function setPaymentTaxAccountedInSupabase(
  paymentAppId: string,
  taxAccounted: boolean,
): Promise<PaymentsRepositoryResult<Payment>> {
  return crmApiPatch<Payment>(`${BASE}/${encodeURIComponent(paymentAppId)}`, {
    taxAccounted,
  });
}

export async function seedPaymentsToSupabase(
  payments: Payment[],
): Promise<PaymentsRepositoryResult<Payment[]>> {
  return crmApiPost<Payment[]>(`${BASE}/seed`, { payments });
}
