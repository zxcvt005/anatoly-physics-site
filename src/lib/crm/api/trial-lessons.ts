import type { TrialLessonFormInput } from '@/lib/trial-lessons/form';
import type { TrialLesson } from '@/types/tutor';
import type { TrialLessonsRepositoryResult } from '@/lib/supabase/trial-lessons/types';
import { crmApiDelete, crmApiGet, crmApiPatch, crmApiPost } from './http';

const BASE = '/api/crm/trial-lessons';

export async function fetchTrialLessonsFromSupabase(): Promise<
  TrialLessonsRepositoryResult<TrialLesson[]>
> {
  return crmApiGet<TrialLesson[]>(BASE);
}

export async function insertTrialLessonToSupabase(
  trial: TrialLesson,
): Promise<TrialLessonsRepositoryResult<TrialLesson>> {
  return crmApiPost<TrialLesson>(BASE, { trial });
}

export async function updateTrialLessonInSupabase(
  trialAppId: string,
  input: TrialLessonFormInput,
  existingTrial: TrialLesson,
): Promise<TrialLessonsRepositoryResult<TrialLesson>> {
  return crmApiPatch<TrialLesson>(`${BASE}/${encodeURIComponent(trialAppId)}`, {
    input,
    existingTrial,
  });
}

export async function deleteTrialLessonFromSupabase(
  trialAppId: string,
): Promise<TrialLessonsRepositoryResult<null>> {
  return crmApiDelete<null>(`${BASE}/${encodeURIComponent(trialAppId)}`);
}

export async function seedTrialLessonsToSupabase(
  trials: TrialLesson[],
): Promise<TrialLessonsRepositoryResult<TrialLesson[]>> {
  return crmApiPost<TrialLesson[]>(`${BASE}/seed`, { trials });
}
