import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import { fetchIntensivesBundleFromSupabase } from '@/lib/supabase/intensives/repository';
import { fetchLessonsFromSupabase } from '@/lib/supabase/lessons/repository';
import { fetchPaymentsFromSupabase } from '@/lib/supabase/payments/repository';
import { fetchRevenueSnapshotsFromSupabase } from '@/lib/supabase/revenue-snapshots/repository';
import { fetchScheduleSlotsFromSupabase } from '@/lib/supabase/schedule-slots/repository';
import { fetchStudentsFromSupabase } from '@/lib/supabase/students/repository';
import { fetchTrialLessonsFromSupabase } from '@/lib/supabase/trial-lessons/repository';
import type { IntensivesBundle } from '@/lib/supabase/intensives/types';
import type {
  Lesson,
  Payment,
  RevenueMonthSnapshot,
  Student,
  TrialLesson,
  WeeklyScheduleSlot,
} from '@/types/tutor';

export interface CrmExportData {
  students: Student[];
  startedAtByStudentId: Map<string, string | null>;
  payments: Payment[];
  lessons: Lesson[];
  scheduleSlots: WeeklyScheduleSlot[];
  intensivesBundle: IntensivesBundle;
  trialLessons: TrialLesson[];
  revenueSnapshots: RevenueMonthSnapshot[];
}

export type CrmExportDataResult =
  | { ok: true; data: CrmExportData }
  | { ok: false; error: string };

async function fetchStudentStartedAtMap(): Promise<
  { ok: true; data: Map<string, string | null> } | { ok: false; error: string }
> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from('students')
    .select('app_id, started_at');

  if (error) {
    return { ok: false, error: error.message };
  }

  const map = new Map<string, string | null>();
  for (const row of data ?? []) {
    if (row.app_id) {
      map.set(row.app_id, row.started_at ?? null);
    }
  }

  return { ok: true, data: map };
}

export async function fetchCrmExportData(): Promise<CrmExportDataResult> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const [
    studentsResult,
    startedAtResult,
    paymentsResult,
    lessonsResult,
    scheduleResult,
    intensivesResult,
    trialsResult,
    revenueResult,
  ] = await Promise.all([
    fetchStudentsFromSupabase(),
    fetchStudentStartedAtMap(),
    fetchPaymentsFromSupabase(),
    fetchLessonsFromSupabase(),
    fetchScheduleSlotsFromSupabase(),
    fetchIntensivesBundleFromSupabase(),
    fetchTrialLessonsFromSupabase(),
    fetchRevenueSnapshotsFromSupabase(),
  ]);

  const results = [
    studentsResult,
    startedAtResult,
    paymentsResult,
    lessonsResult,
    scheduleResult,
    intensivesResult,
    trialsResult,
    revenueResult,
  ];

  for (const result of results) {
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
  }

  if (
    !studentsResult.ok ||
    !startedAtResult.ok ||
    !paymentsResult.ok ||
    !lessonsResult.ok ||
    !scheduleResult.ok ||
    !intensivesResult.ok ||
    !trialsResult.ok ||
    !revenueResult.ok
  ) {
    return { ok: false, error: 'Failed to load CRM export data' };
  }

  return {
    ok: true,
    data: {
      students: studentsResult.data,
      startedAtByStudentId: startedAtResult.data,
      payments: paymentsResult.data,
      lessons: lessonsResult.data,
      scheduleSlots: scheduleResult.data,
      intensivesBundle: intensivesResult.data,
      trialLessons: trialsResult.data,
      revenueSnapshots: revenueResult.data,
    },
  };
}
