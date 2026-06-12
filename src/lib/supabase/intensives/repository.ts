import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import type { Intensive, IntensiveStatus } from '@/types/tutor';
import {
  intensiveToInsertRow,
  isStoredProgressStatus,
  mapIntensiveRows,
  mapProgressRows,
} from './mappers';
import type {
  IntensiveRow,
  IntensivesBundle,
  IntensivesRepositoryResult,
  StudentIntensiveProgressWithAppIdsRow,
} from './types';

const PROGRESS_SELECT = `
  status,
  students (
    app_id
  ),
  intensives (
    app_id
  )
`;

function getClient() {
  return createSupabaseAdminClient();
}

async function resolveStudentUuid(
  studentAppId: string,
): Promise<IntensivesRepositoryResult<string>> {
  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('app_id', studentAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return {
      ok: false,
      error: `Student not found in Supabase: ${studentAppId}`,
    };
  }

  return { ok: true, data: data.id };
}

async function resolveIntensiveUuid(
  intensiveAppId: string,
): Promise<IntensivesRepositoryResult<string>> {
  const client = getClient();
  const { data, error } = await client
    .from('intensives')
    .select('id')
    .eq('app_id', intensiveAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return {
      ok: false,
      error: `Intensive not found in Supabase: ${intensiveAppId}`,
    };
  }

  return { ok: true, data: data.id };
}

export async function fetchIntensivesBundleFromSupabase(): Promise<
  IntensivesRepositoryResult<IntensivesBundle>
> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();

  const [intensivesResult, progressResult] = await Promise.all([
    client.from('intensives').select('*').order('title', { ascending: true }),
    client.from('student_intensive_progress').select(PROGRESS_SELECT),
  ]);

  if (intensivesResult.error) {
    return { ok: false, error: intensivesResult.error.message };
  }

  if (progressResult.error) {
    return { ok: false, error: progressResult.error.message };
  }

  return {
    ok: true,
    data: {
      intensives: mapIntensiveRows(intensivesResult.data as IntensiveRow[] | null),
      progress: mapProgressRows(
        progressResult.data as StudentIntensiveProgressWithAppIdsRow[] | null,
      ),
    },
  };
}

export async function insertIntensiveToSupabase(
  intensive: Intensive,
): Promise<IntensivesRepositoryResult<Intensive>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('intensives')
    .insert(intensiveToInsertRow(intensive))
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: {
      id: (data as IntensiveRow).app_id,
      title: (data as IntensiveRow).title,
    },
  };
}

export async function updateIntensiveTitleInSupabase(
  intensiveAppId: string,
  title: string,
): Promise<IntensivesRepositoryResult<Intensive>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const trimmed = title.trim();

  if (!trimmed) {
    return { ok: false, error: 'Title is required' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('intensives')
    .update({ title: trimmed })
    .eq('app_id', intensiveAppId)
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = data as IntensiveRow;

  return {
    ok: true,
    data: {
      id: row.app_id,
      title: row.title,
    },
  };
}

export async function deleteIntensiveFromSupabase(
  intensiveAppId: string,
): Promise<IntensivesRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { error } = await client
    .from('intensives')
    .delete()
    .eq('app_id', intensiveAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: null };
}

export async function updateStudentIntensiveProgressInSupabase(
  studentAppId: string,
  intensiveAppId: string,
  status: IntensiveStatus,
): Promise<IntensivesRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const studentUuidResult = await resolveStudentUuid(studentAppId);
  if (!studentUuidResult.ok) {
    return studentUuidResult;
  }

  const intensiveUuidResult = await resolveIntensiveUuid(intensiveAppId);
  if (!intensiveUuidResult.ok) {
    return intensiveUuidResult;
  }

  const client = getClient();

  if (!isStoredProgressStatus(status)) {
    const { error } = await client
      .from('student_intensive_progress')
      .delete()
      .eq('student_id', studentUuidResult.data)
      .eq('intensive_id', intensiveUuidResult.data);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: null };
  }

  const { data: existing, error: selectError } = await client
    .from('student_intensive_progress')
    .select('id')
    .eq('student_id', studentUuidResult.data)
    .eq('intensive_id', intensiveUuidResult.data)
    .maybeSingle();

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  if (existing) {
    const { error } = await client
      .from('student_intensive_progress')
      .update({ status })
      .eq('id', existing.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: null };
  }

  const { error: insertError } = await client
    .from('student_intensive_progress')
    .insert({
      student_id: studentUuidResult.data,
      intensive_id: intensiveUuidResult.data,
      status,
    });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true, data: null };
}

export async function seedIntensivesBundleToSupabase(
  bundle: IntensivesBundle,
): Promise<IntensivesRepositoryResult<IntensivesBundle>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  for (const intensive of bundle.intensives) {
    const insertResult = await insertIntensiveToSupabase(intensive);

    if (!insertResult.ok) {
      return insertResult;
    }
  }

  for (const entry of bundle.progress) {
    if (!isStoredProgressStatus(entry.status)) {
      continue;
    }

    const progressResult = await updateStudentIntensiveProgressInSupabase(
      entry.studentId,
      entry.intensiveId,
      entry.status,
    );

    if (!progressResult.ok) {
      continue;
    }
  }

  return fetchIntensivesBundleFromSupabase();
}

export async function fetchStudentIntensivesBundleByStudentAppId(
  studentAppId: string,
): Promise<IntensivesRepositoryResult<IntensivesBundle>> {
  const bundleResult = await fetchIntensivesBundleFromSupabase();

  if (!bundleResult.ok) {
    return bundleResult;
  }

  const progress = bundleResult.data.progress.filter(
    (entry) => entry.studentId === studentAppId,
  );

  const intensiveIds = new Set(progress.map((entry) => entry.intensiveId));
  const intensives = bundleResult.data.intensives.filter((intensive) =>
    intensiveIds.has(intensive.id),
  );

  return {
    ok: true,
    data: {
      intensives,
      progress,
    },
  };
}
