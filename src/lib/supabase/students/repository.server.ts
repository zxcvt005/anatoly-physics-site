import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import {
  logRepositoryFailure,
  logSupabaseQueryFailure,
} from '@/lib/supabase/log-query-failure.server';
import { startCrmOperationTimer } from '@/lib/crm/diagnostics/log-failure.server';
import type { Student } from '@/types/tutor';
import { studentRowToStudent } from './mappers';
import type { StudentRow } from './types';

export async function fetchStudentByAccessTokenFromSupabase(
  token: string,
): Promise<Student | null> {
  const operation = 'fetchStudentByAccessTokenFromSupabase';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return null;
  }

  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('access_token', token)
    .maybeSingle();

  if (error) {
    logSupabaseQueryFailure(operation, error, startedAt);
    return null;
  }

  if (!data) {
    return null;
  }

  return studentRowToStudent(data as StudentRow);
}
