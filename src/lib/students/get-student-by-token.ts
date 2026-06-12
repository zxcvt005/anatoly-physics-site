import { isStrictSupabaseMode } from '@/lib/crm/data-source';
import { getStudentByToken as getMockStudentByToken } from '@/lib/mock-data';
import { shouldUseSupabaseForStudents } from '@/lib/supabase/env';
import { fetchStudentByAccessTokenFromSupabase } from '@/lib/supabase/students/repository.server';
import type { Student } from '@/types/tutor';

export async function getStudentByTokenForPage(
  token: string,
): Promise<Student | undefined> {
  if (shouldUseSupabaseForStudents()) {
    const student = await fetchStudentByAccessTokenFromSupabase(token);
    if (student) {
      return student;
    }

    if (isStrictSupabaseMode()) {
      return undefined;
    }
  }

  return getMockStudentByToken(token);
}
