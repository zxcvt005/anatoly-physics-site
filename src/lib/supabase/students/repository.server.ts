import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import type { Student } from '@/types/tutor';
import { studentRowToStudent } from './mappers';
import type { StudentRow } from './types';

export async function fetchStudentByAccessTokenFromSupabase(
  token: string,
): Promise<Student | null> {
  if (!isSupabaseConfiguredOnServer()) {
    return null;
  }

  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('access_token', token)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return studentRowToStudent(data as StudentRow);
}
