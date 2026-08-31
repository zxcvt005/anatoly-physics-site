import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import {
  logRepositoryFailure,
  logSupabaseQueryFailure,
} from '@/lib/supabase/log-query-failure.server';
import { startCrmOperationTimer } from '@/lib/crm/diagnostics/log-failure.server';
import type { StudentFormInput } from '@/lib/students/form';
import type { Student } from '@/types/tutor';
import { hardDeleteStudentByAppId } from './delete-student-cascade';
import {
  studentFormInputToUpdateRow,
  studentRowToStudent,
  studentToInsertRow,
} from './mappers';
import type { StudentRow, StudentsRepositoryResult } from './types';

function getClient() {
  return createSupabaseAdminClient();
}

function mapRows(rows: StudentRow[] | null): Student[] {
  return (rows ?? []).map(studentRowToStudent);
}

export async function fetchStudentsFromSupabase(): Promise<
  StudentsRepositoryResult<Student[]>
> {
  const operation = 'fetchStudentsFromSupabase';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('*')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    logSupabaseQueryFailure(operation, error, startedAt);
    return { ok: false, error: error.message };
  }

  return { ok: true, data: mapRows(data as StudentRow[] | null) };
}

export async function insertStudentToSupabase(
  student: Student,
): Promise<StudentsRepositoryResult<Student>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .insert(studentToInsertRow(student))
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: studentRowToStudent(data as StudentRow) };
}

export async function updateStudentInSupabase(
  studentId: string,
  input: StudentFormInput,
  existingStudent: Student,
): Promise<StudentsRepositoryResult<Student>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .update(studentFormInputToUpdateRow(input, existingStudent))
    .eq('app_id', studentId)
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: studentRowToStudent(data as StudentRow) };
}

export async function deleteStudentFromSupabase(
  studentId: string,
): Promise<StudentsRepositoryResult<null>> {
  const operation = 'deleteStudentFromSupabase';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const deleteResult = await hardDeleteStudentByAppId(client, studentId);

  if (!deleteResult.ok) {
    logRepositoryFailure(operation, deleteResult.error, startedAt);
    return { ok: false, error: deleteResult.error };
  }

  return { ok: true, data: null };
}

export async function seedStudentsToSupabase(
  students: Student[],
): Promise<StudentsRepositoryResult<Student[]>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  if (students.length === 0) {
    return { ok: true, data: [] };
  }

  const client = getClient();
  const rows = students.map(studentToInsertRow);
  const { data, error } = await client.from('students').insert(rows).select('*');

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: mapRows(data as StudentRow[] | null) };
}
