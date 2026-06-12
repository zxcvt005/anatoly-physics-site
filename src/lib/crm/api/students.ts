import type { StudentFormInput } from '@/lib/students/form';
import type { Student } from '@/types/tutor';
import type { StudentsRepositoryResult } from '@/lib/supabase/students/types';
import { crmApiDelete, crmApiGet, crmApiPatch, crmApiPost } from './http';

const BASE = '/api/crm/students';

export async function fetchStudentsFromSupabase(): Promise<
  StudentsRepositoryResult<Student[]>
> {
  return crmApiGet<Student[]>(BASE);
}

export async function insertStudentToSupabase(
  student: Student,
): Promise<StudentsRepositoryResult<Student>> {
  return crmApiPost<Student>(BASE, { student });
}

export async function updateStudentInSupabase(
  studentId: string,
  input: StudentFormInput,
  existingStudent: Student,
): Promise<StudentsRepositoryResult<Student>> {
  return crmApiPatch<Student>(`${BASE}/${encodeURIComponent(studentId)}`, {
    input,
    existingStudent,
  });
}

export async function deleteStudentFromSupabase(
  studentId: string,
): Promise<StudentsRepositoryResult<null>> {
  return crmApiDelete<null>(`${BASE}/${encodeURIComponent(studentId)}`);
}

export async function seedStudentsToSupabase(
  students: Student[],
): Promise<StudentsRepositoryResult<Student[]>> {
  return crmApiPost<Student[]>(`${BASE}/seed`, { students });
}
