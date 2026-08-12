import type { Lesson, Payment, Student, WeeklyScheduleSlot } from '@/types/tutor';
import type { LessonsRepositoryResult } from '@/lib/supabase/lessons/types';
import type { StudentPortalData } from '@/lib/student-portal/types';
import type {
  IntensivesBundle,
  IntensivesRepositoryResult,
} from '@/lib/supabase/intensives/types';
import type { PaymentsRepositoryResult } from '@/lib/supabase/payments/types';
import type { ScheduleSlotsRepositoryResult } from '@/lib/supabase/schedule-slots/types';
import type { StudentsRepositoryResult } from '@/lib/supabase/students/types';
import type { RecordLegalConsentInput } from '@/types/legal-consent';
import { crmApiGet, crmApiPost } from './http';

const bootstrapPromises = new Map<
  string,
  Promise<{ ok: true; data: StudentPortalData } | { ok: false; error: string }>
>();

function studentPortalBase(token: string): string {
  return `/api/student/${encodeURIComponent(token)}`;
}

function getStudentPortalBootstrap(token: string) {
  let promise = bootstrapPromises.get(token);

  if (!promise) {
    promise = crmApiGet<StudentPortalData>(studentPortalBase(token));
    bootstrapPromises.set(token, promise);
  }

  return promise;
}

export function clearStudentPortalBootstrapCache(token?: string) {
  if (token) {
    bootstrapPromises.delete(token);
    return;
  }

  bootstrapPromises.clear();
}

export async function fetchStudentPortalStudents(
  token: string,
): Promise<StudentsRepositoryResult<Student[]>> {
  const result = await getStudentPortalBootstrap(token);

  if (!result.ok) {
    return result;
  }

  return { ok: true, data: [result.data.student] };
}

export async function fetchStudentPortalScheduleSlots(
  token: string,
): Promise<ScheduleSlotsRepositoryResult<WeeklyScheduleSlot[]>> {
  const result = await getStudentPortalBootstrap(token);

  if (!result.ok) {
    return result;
  }

  return { ok: true, data: result.data.slots };
}

export async function fetchStudentPortalPayments(
  token: string,
): Promise<PaymentsRepositoryResult<Payment[]>> {
  const result = await getStudentPortalBootstrap(token);

  if (!result.ok) {
    return result;
  }

  return { ok: true, data: result.data.payments };
}

export async function fetchStudentPortalLessons(
  token: string,
): Promise<LessonsRepositoryResult<Lesson[]>> {
  const result = await getStudentPortalBootstrap(token);

  if (!result.ok) {
    return result;
  }

  return { ok: true, data: result.data.lessons };
}

export async function fetchStudentPortalIntensivesBundle(
  token: string,
): Promise<IntensivesRepositoryResult<IntensivesBundle>> {
  const result = await getStudentPortalBootstrap(token);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    data: {
      intensives: result.data.intensives,
      progress: result.data.intensiveProgress,
    },
  };
}

export async function insertStudentPortalPendingPayment(
  token: string,
  payment: Pick<Payment, 'id' | 'amount' | 'note'>,
  options?: {
    consents?: RecordLegalConsentInput[];
  },
): Promise<PaymentsRepositoryResult<Payment>> {
  const result = await crmApiPost<Payment>(
    `${studentPortalBase(token)}/payments`,
    {
      id: payment.id,
      amount: payment.amount,
      note: payment.note,
      consents: options?.consents,
    },
  );

  if (result.ok) {
    bootstrapPromises.delete(token);
  }

  return result;
}
