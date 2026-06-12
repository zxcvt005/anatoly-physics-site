import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import type { TrialLesson } from '@/types/tutor';
import type { TrialLessonFormInput } from '@/lib/trial-lessons/form';
import {
  mapTrialLessonRows,
  trialLessonPatchToUpdateRow,
  trialLessonRowToTrialLesson,
  trialLessonToInsertRow,
} from './mappers';
import type {
  TrialLessonWithStudentRow,
  TrialLessonsRepositoryResult,
} from './types';

const TRIAL_SELECT = `
  id,
  app_id,
  first_name,
  last_name,
  trial_date,
  grade_class,
  goal,
  current_result,
  proposed_rate_4_weeks,
  proposed_lessons_per_week,
  parent_name,
  parent_phone,
  parent_contacts,
  call_status,
  comment,
  linked_student_id,
  created_at,
  updated_at,
  students (
    app_id
  )
`;

function getClient() {
  return createSupabaseAdminClient();
}

function buildTrialLessonFromInput(
  trialAppId: string,
  input: TrialLessonFormInput,
  existing?: TrialLesson,
): TrialLesson {
  return {
    id: trialAppId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    trialDate: input.trialDate,
    gradeClass: input.gradeClass.trim(),
    goal: input.goal.trim(),
    currentResult: input.currentResult.trim(),
    proposedRate4Weeks: input.proposedRate4Weeks,
    proposedLessonsPerWeek: input.proposedLessonsPerWeek,
    parentContacts: input.parentContacts.trim(),
    callStatus: input.callStatus ?? existing?.callStatus ?? 'not_called',
    comment: input.comment?.trim() || undefined,
    linkedStudentId: input.linkedStudentId ?? existing?.linkedStudentId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

async function resolveLinkedStudentUuid(
  linkedStudentAppId: string | undefined,
): Promise<TrialLessonsRepositoryResult<string | null>> {
  if (!linkedStudentAppId) {
    return { ok: true, data: null };
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('app_id', linkedStudentAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return {
      ok: false,
      error: `Student not found in Supabase: ${linkedStudentAppId}`,
    };
  }

  return { ok: true, data: data.id };
}

async function fetchTrialLessonByAppId(
  trialAppId: string,
): Promise<TrialLessonsRepositoryResult<TrialLesson>> {
  const client = getClient();
  const { data, error } = await client
    .from('trial_lessons')
    .select(TRIAL_SELECT)
    .eq('app_id', trialAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'Trial lesson not found' };
  }

  return {
    ok: true,
    data: trialLessonRowToTrialLesson(data as TrialLessonWithStudentRow),
  };
}

export async function fetchTrialLessonsFromSupabase(): Promise<
  TrialLessonsRepositoryResult<TrialLesson[]>
> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('trial_lessons')
    .select(TRIAL_SELECT)
    .order('trial_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: mapTrialLessonRows(data as TrialLessonWithStudentRow[] | null),
  };
}

export async function insertTrialLessonToSupabase(
  trial: TrialLesson,
): Promise<TrialLessonsRepositoryResult<TrialLesson>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const linkedStudentResult = await resolveLinkedStudentUuid(trial.linkedStudentId);
  if (!linkedStudentResult.ok) {
    return linkedStudentResult;
  }

  const client = getClient();
  const { error } = await client
    .from('trial_lessons')
    .insert(trialLessonToInsertRow(trial, linkedStudentResult.data));

  if (error) {
    return { ok: false, error: error.message };
  }

  return fetchTrialLessonByAppId(trial.id);
}

export async function updateTrialLessonInSupabase(
  trialAppId: string,
  input: TrialLessonFormInput,
  existingTrial: TrialLesson,
): Promise<TrialLessonsRepositoryResult<TrialLesson>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const merged = buildTrialLessonFromInput(trialAppId, input, existingTrial);
  const linkedStudentResult = await resolveLinkedStudentUuid(merged.linkedStudentId);

  if (!linkedStudentResult.ok) {
    return linkedStudentResult;
  }

  const client = getClient();
  const { error } = await client
    .from('trial_lessons')
    .update(trialLessonPatchToUpdateRow(merged, linkedStudentResult.data))
    .eq('app_id', trialAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return fetchTrialLessonByAppId(trialAppId);
}

export async function deleteTrialLessonFromSupabase(
  trialAppId: string,
): Promise<TrialLessonsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { error } = await client
    .from('trial_lessons')
    .delete()
    .eq('app_id', trialAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: null };
}

export async function seedTrialLessonsToSupabase(
  trials: TrialLesson[],
): Promise<TrialLessonsRepositoryResult<TrialLesson[]>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  if (trials.length === 0) {
    return { ok: true, data: [] };
  }

  for (const trial of trials) {
    let trialForInsert = trial;

    if (trial.linkedStudentId) {
      const linkedStudentResult = await resolveLinkedStudentUuid(
        trial.linkedStudentId,
      );

      if (!linkedStudentResult.ok || !linkedStudentResult.data) {
        trialForInsert = { ...trial, linkedStudentId: undefined };
      }
    }

    const insertResult = await insertTrialLessonToSupabase(trialForInsert);

    if (!insertResult.ok) {
      return insertResult;
    }
  }

  return fetchTrialLessonsFromSupabase();
}
