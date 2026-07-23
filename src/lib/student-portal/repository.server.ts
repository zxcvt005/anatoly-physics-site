import 'server-only';

import {
  startCrmOperationTimer,
} from '@/lib/crm/diagnostics/log-failure.server';
import { fetchStudentIntensivesBundleByStudentAppId } from '@/lib/supabase/intensives/repository';
import { fetchLessonsByStudentAppIdFromSupabase } from '@/lib/supabase/lessons/repository';
import {
  fetchPaymentsFromSupabase,
  insertPaymentToSupabase,
} from '@/lib/supabase/payments/repository';
import { fetchScheduleSlotsFromSupabase } from '@/lib/supabase/schedule-slots/repository';
import { fetchStudentByAccessTokenFromSupabase } from '@/lib/supabase/students/repository.server';
import { logRepositoryFailure } from '@/lib/supabase/log-query-failure.server';
import type { Payment } from '@/types/tutor';
import type {
  StudentPortalData,
  StudentPortalRepositoryResult,
} from './types';

export async function fetchStudentPortalDataByToken(
  token: string,
): Promise<StudentPortalRepositoryResult<StudentPortalData>> {
  const operation = 'fetchStudentPortalDataByToken';
  const startedAt = startCrmOperationTimer();

  const student = await fetchStudentByAccessTokenFromSupabase(token);

  if (!student) {
    logRepositoryFailure(
      `${operation}.fetchStudentByAccessTokenFromSupabase`,
      'Student not found',
      startedAt,
    );
    return { ok: false, error: 'Student not found' };
  }

  const slotsResult = await fetchScheduleSlotsFromSupabase();

  if (!slotsResult.ok) {
    logRepositoryFailure(
      `${operation}.fetchScheduleSlotsFromSupabase`,
      slotsResult.error,
      startedAt,
    );
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
    logRepositoryFailure(
      `${operation}.fetchPaymentsFromSupabase`,
      paymentsResult.error,
      startedAt,
    );
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
    logRepositoryFailure(
      `${operation}.fetchLessonsByStudentAppIdFromSupabase`,
      lessonsResult.error,
      startedAt,
    );
    return lessonsResult;
  }

  if (!intensivesResult.ok) {
    logRepositoryFailure(
      `${operation}.fetchStudentIntensivesBundleByStudentAppId`,
      intensivesResult.error,
      startedAt,
    );
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
  const operation = 'createStudentPortalPendingPayment';
  const startedAt = startCrmOperationTimer();

  const student = await fetchStudentByAccessTokenFromSupabase(token);

  if (!student) {
    logRepositoryFailure(
      `${operation}.fetchStudentByAccessTokenFromSupabase`,
      'Student not found',
      startedAt,
    );
    return { ok: false, error: 'Student not found' };
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    logRepositoryFailure(`${operation}.validateAmount`, 'Invalid amount', startedAt);
    return { ok: false, error: 'Invalid amount' };
  }

  if (!input.id.trim()) {
    logRepositoryFailure(`${operation}.validateId`, 'Missing payment id', startedAt);
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

  const result = await insertPaymentToSupabase(payment);

  if (!result.ok) {
    logRepositoryFailure(`${operation}.insertPaymentToSupabase`, result.error, startedAt);
  }

  return result;
}
