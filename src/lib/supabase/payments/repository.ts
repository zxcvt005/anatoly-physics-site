import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import type { Payment, PaymentStatus } from '@/types/tutor';
import {
  mapPaymentRows,
  paymentRowToPayment,
  paymentToInsertRow,
} from './mappers';
import type {
  PaymentUpdateRow,
  PaymentWithStudentRow,
  PaymentsRepositoryResult,
} from './types';

const PAYMENT_SELECT = `
  id,
  app_id,
  student_id,
  amount,
  status,
  note,
  tax_accounted,
  created_at,
  updated_at,
  students (
    app_id
  )
`;

function getClient() {
  return createSupabaseAdminClient();
}

async function resolveStudentUuid(
  studentAppId: string,
): Promise<PaymentsRepositoryResult<string>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('app_id', studentAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return {
      ok: false,
      error: `Student not found in Supabase: ${studentAppId}`,
    };
  }

  return { ok: true, data: data.id };
}

async function fetchPaymentByAppId(
  paymentAppId: string,
): Promise<PaymentsRepositoryResult<Payment>> {
  const client = getClient();
  const { data, error } = await client
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('app_id', paymentAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'Payment not found' };
  }

  return {
    ok: true,
    data: paymentRowToPayment(data as PaymentWithStudentRow),
  };
}

export async function fetchPaymentsFromSupabase(): Promise<
  PaymentsRepositoryResult<Payment[]>
> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('payments')
    .select(PAYMENT_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: mapPaymentRows(data as PaymentWithStudentRow[] | null),
  };
}

export async function insertPaymentToSupabase(
  payment: Payment,
): Promise<PaymentsRepositoryResult<Payment>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const studentUuidResult = await resolveStudentUuid(payment.studentId);
  if (!studentUuidResult.ok) {
    return studentUuidResult;
  }

  const { error } = await client
    .from('payments')
    .insert(paymentToInsertRow(payment, studentUuidResult.data));

  if (error) {
    return { ok: false, error: error.message };
  }

  return fetchPaymentByAppId(payment.id);
}

export async function updatePaymentInSupabase(
  paymentAppId: string,
  patch: PaymentUpdateRow,
): Promise<PaymentsRepositoryResult<Payment>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { error } = await client
    .from('payments')
    .update(patch)
    .eq('app_id', paymentAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return fetchPaymentByAppId(paymentAppId);
}

export async function updatePaymentStatusInSupabase(
  paymentAppId: string,
  status: PaymentStatus,
): Promise<PaymentsRepositoryResult<Payment>> {
  return updatePaymentInSupabase(paymentAppId, { status });
}

export async function setPaymentTaxAccountedInSupabase(
  paymentAppId: string,
  taxAccounted: boolean,
): Promise<PaymentsRepositoryResult<Payment>> {
  return updatePaymentInSupabase(paymentAppId, { tax_accounted: taxAccounted });
}

export async function deletePaymentFromSupabase(
  paymentAppId: string,
): Promise<PaymentsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { error } = await client
    .from('payments')
    .delete()
    .eq('app_id', paymentAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: null };
}

export async function seedPaymentsToSupabase(
  payments: Payment[],
): Promise<PaymentsRepositoryResult<Payment[]>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  if (payments.length === 0) {
    return { ok: true, data: [] };
  }

  const client = getClient();
  const studentAppIds = [...new Set(payments.map((payment) => payment.studentId))];
  const { data: students, error: studentsError } = await client
    .from('students')
    .select('id, app_id')
    .in('app_id', studentAppIds);

  if (studentsError) {
    return { ok: false, error: studentsError.message };
  }

  const studentUuidByAppId = new Map<string, string>();
  for (const student of students ?? []) {
    studentUuidByAppId.set(student.app_id, student.id);
  }

  for (const payment of payments) {
    const studentUuid = studentUuidByAppId.get(payment.studentId);
    if (!studentUuid) {
      continue;
    }

    const insertResult = await insertPaymentToSupabase(payment);
    if (!insertResult.ok) {
      return insertResult;
    }
  }

  return fetchPaymentsFromSupabase();
}
