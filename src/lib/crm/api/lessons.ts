import type { Lesson } from '@/types/tutor';
import type { LessonsRepositoryResult } from '@/lib/supabase/lessons/types';
import { crmApiDelete, crmApiGet, crmApiPatch, crmApiPost } from './http';

const BASE = '/api/crm/lessons';

export async function fetchLessonsFromSupabase(): Promise<
  LessonsRepositoryResult<Lesson[]>
> {
  return crmApiGet<Lesson[]>(BASE);
}

export async function upsertLessonToSupabase(
  lesson: Lesson,
): Promise<LessonsRepositoryResult<Lesson>> {
  return crmApiPost<Lesson>(BASE, { lesson });
}

export async function upsertLessonsToSupabase(
  lessons: Lesson[],
): Promise<LessonsRepositoryResult<Lesson[]>> {
  return crmApiPost<Lesson[]>(`${BASE}/batch`, { lessons });
}

export async function updateLessonInSupabase(
  lessonAppId: string,
  patch: Partial<Lesson>,
): Promise<LessonsRepositoryResult<Lesson>> {
  return crmApiPatch<Lesson>(`${BASE}/${encodeURIComponent(lessonAppId)}`, {
    patch,
  });
}

export async function deleteLessonFromSupabase(
  lessonAppId: string,
): Promise<LessonsRepositoryResult<null>> {
  return crmApiDelete<null>(`${BASE}/${encodeURIComponent(lessonAppId)}`);
}

export async function seedLessonsToSupabase(
  lessons: Lesson[],
): Promise<LessonsRepositoryResult<Lesson[]>> {
  return crmApiPost<Lesson[]>(`${BASE}/seed`, lessons);
}
