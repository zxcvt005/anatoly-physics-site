import 'server-only';

import { fetchStudentIntensivesBundleByStudentAppId } from '@/lib/supabase/intensives/repository';
import { fetchLessonsByStudentAppIdFromSupabase } from '@/lib/supabase/lessons/repository';
import {
  fetchPaymentsFromSupabase,
  insertPaymentToSupabase,
} from '@/lib/supabase/payments/repository';
import { fetchScheduleSlotsFromSupabase } from '@/lib/supabase/schedule-slots/repository';
import { fetchStudentByAccessTokenFromSupabase } from '@/lib/supabase/students/repository.server';
import type { Payment } from '@/types/tutor';
import type {
  StudentPortalData,
  StudentPortalRepositoryResult,
} from './types';

export async function fetchStudentPortalDataByToken(
  token: string,
): Promise<StudentPortalRepositoryResult<StudentPortalData>> {
  const student = await fetchStudentByAccessTokenFromSupabase(token);

  if (!student) {
    return { ok: false, error: 'Student not found' };
  }

  const slotsResult = await fetchScheduleSlotsFromSupabase();

  if (!slotsResult.ok) {
    return slotsResult;
  }

  const slots = slotsResult.data
    .filter((slot) => slot.studentIds.includes(student.id))
    .map((slot) => ({
      ...slot,
      studentIds: [student.id],
    }));

  const paymentsResult = await fetchPaymentsFromSupabase();

  if (!paymentsResult.ok) {
    return paymentsResult;
  }

  const payments = paymentsResult.data.filter(
    (payment) => payment.studentId === student.id,
  );

  const [lessonsResult, intensivesResult] = await Promise.all([
    fetchLessonsByStudentAppIdFromSupabase(student.id),
    fetchStudentIntensivesBundleByStudentAppId(student.id),
  ]);

  if (!lessonsResult.ok) {
    return lessonsResult;
  }

  if (!intensivesResult.ok) {
    return intensivesResult;
  }

  return {
    ok: true,
    data: {
      student,
      slots,
      payments,
      lessons: lessonsResult.data,
      intensives: intensivesResult.data.intensives,
      intensiveProgress: intensivesResult.data.progress,
    },
  };
}

export async function createStudentPortalPendingPayment(
  token: string,
  input: {
    id: string;
    amount: number;
    note?: string;
  },
): Promise<StudentPortalRepositoryResult<Payment>> {
  const student = await fetchStudentByAccessTokenFromSupabase(token);

  if (!student) {
    return { ok: false, error: 'Student not found' };
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'Invalid amount' };
  }

  if (!input.id.trim()) {
    return { ok: false, error: 'Missing payment id' };
  }

  const payment: Payment = {
    id: input.id,
    studentId: student.id,
    amount: Math.trunc(input.amount),
    status: 'pending',
    createdAt: new Date().toISOString(),
    note: input.note?.trim() || undefined,
  };

  return insertPaymentToSupabase(payment);
}
