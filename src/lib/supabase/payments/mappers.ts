import type { Payment } from '@/types/tutor';
import { normalizeCrmDateInput } from '@/lib/crm-datetime';
import type { PaymentWithStudentRow } from './types';

function extractStudentAppId(
  students: { app_id: string } | { app_id: string }[] | null | undefined,
): string | undefined {
  if (!students) {
    return undefined;
  }

  if (Array.isArray(students)) {
    return students[0]?.app_id;
  }

  return students.app_id;
}

export function paymentRowToPayment(row: PaymentWithStudentRow): Payment {
  const studentAppId = extractStudentAppId(row.students);

  if (!studentAppId) {
    throw new Error(`Payment ${row.app_id} is missing student app_id`);
  }

  return {
    id: row.app_id,
    studentId: studentAppId,
    amount: row.amount,
    status: row.status,
    createdAt: normalizeCrmDateInput(row.created_at),
    note: row.note ?? undefined,
    taxAccounted: row.tax_accounted,
  };
}

export function paymentToInsertRow(
  payment: Payment,
  studentUuid: string,
) {
  return {
    app_id: payment.id,
    student_id: studentUuid,
    amount: payment.amount,
    status: payment.status,
    note: payment.note ?? null,
    tax_accounted: payment.taxAccounted ?? false,
    created_at: payment.createdAt,
  };
}

export function mapPaymentRows(
  rows: PaymentWithStudentRow[] | null,
): Payment[] {
  return (rows ?? []).map(paymentRowToPayment);
}
