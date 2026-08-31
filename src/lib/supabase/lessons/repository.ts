import 'server-only';

import { sortLessonsForUpsert } from '@/lib/lessons/persist';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import {
  logRepositoryFailure,
  logSupabaseQueryFailure,
} from '@/lib/supabase/log-query-failure.server';
import { startCrmOperationTimer } from '@/lib/crm/diagnostics/log-failure.server';
import type { Lesson } from '@/types/tutor';
import {
  lessonPatchToUpdateRow,
  lessonRowToLesson,
  lessonToUpsertRow,
  mapLessonRows,
} from './mappers';
import type {
  LessonRow,
  LessonWithStudentRow,
  LessonsList,
  LessonsRepositoryResult,
} from './types';

const LESSON_SELECT = `
  id,
  app_id,
  student_id,
  lesson_at,
  end_time,
  status,
  payment_status,
  lesson_type,
  is_outside_schedule,
  makeup_for_lesson_id,
  makeup_status,
  is_chargeable,
  is_unexcused_absence,
  topic,
  lesson_topic_id,
  attendance,
  homework_status,
  homework_score,
  homework_points_earned,
  homework_points_max,
  homework_percent,
  comment,
  transferred_to_lesson_id,
  transferred_from_lesson_id,
  transfer_comment,
  created_at,
  updated_at,
  students (
    app_id
  ),
  lesson_topics (
    app_id,
    title
  )
`;

function getClient() {
  return createSupabaseAdminClient();
}

async function fetchLessonAppIdMap(): Promise<
  LessonsRepositoryResult<Map<string, string>>
> {
  const client = getClient();
  const { data, error } = await client.from('lessons').select('id, app_id');

  if (error) {
    return { ok: false, error: error.message };
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.id, row.app_id);
  }

  return { ok: true, data: map };
}

async function fetchTopicAppIdMap(): Promise<
  LessonsRepositoryResult<Map<string, string>>
> {
  const client = getClient();
  const { data, error } = await client.from('lesson_topics').select('id, app_id');

  if (error) {
    return { ok: false, error: error.message };
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.app_id, row.id);
  }

  return { ok: true, data: map };
}

async function resolveStudentUuid(
  studentAppId: string,
): Promise<LessonsRepositoryResult<string>> {
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

async function fetchLessonByAppId(
  lessonAppId: string,
): Promise<LessonsRepositoryResult<Lesson>> {
  const appIdMapResult = await fetchLessonAppIdMap();

  if (!appIdMapResult.ok) {
    return appIdMapResult;
  }

  const client = getClient();
  const { data, error } = await client
    .from('lessons')
    .select(LESSON_SELECT)
    .eq('app_id', lessonAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'Lesson not found' };
  }

  const lesson = lessonRowToLesson(
    data as LessonWithStudentRow,
    appIdMapResult.data,
  );

  if (!lesson) {
    return { ok: false, error: 'Lesson mapping failed' };
  }

  return { ok: true, data: lesson };
}

async function fetchLessonsBundle(): Promise<
  LessonsRepositoryResult<{
    rows: LessonWithStudentRow[];
    appIdByUuid: Map<string, string>;
  }>
> {
  const operation = 'fetchLessonsBundle';
  const startedAt = startCrmOperationTimer();
  const client = getClient();

  const [lessonsResult, appIdMapResult] = await Promise.all([
    client.from('lessons').select(LESSON_SELECT).order('lesson_at', {
      ascending: false,
    }),
    fetchLessonAppIdMap(),
  ]);

  if (lessonsResult.error) {
    logSupabaseQueryFailure(
      `${operation}.selectLessons`,
      lessonsResult.error,
      startedAt,
    );
    return { ok: false, error: lessonsResult.error.message };
  }

  if (!appIdMapResult.ok) {
    logRepositoryFailure(`${operation}.fetchLessonAppIdMap`, appIdMapResult.error, startedAt);
    return appIdMapResult;
  }

  return {
    ok: true,
    data: {
      rows: (lessonsResult.data as LessonWithStudentRow[] | null) ?? [],
      appIdByUuid: appIdMapResult.data,
    },
  };
}

export async function fetchLessonsFromSupabase(): Promise<
  LessonsRepositoryResult<LessonsList>
> {
  const operation = 'fetchLessonsFromSupabase';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return { ok: false, error: 'Supabase is not configured' };
  }

  const bundleResult = await fetchLessonsBundle();

  if (!bundleResult.ok) {
    return bundleResult;
  }

  try {
    return {
      ok: true,
      data: mapLessonRows(bundleResult.data.rows, bundleResult.data.appIdByUuid),
    };
  } catch (mappingError) {
    logRepositoryFailure(`${operation}.mapLessonRows`, mappingError, startedAt);
    throw mappingError;
  }
}

export async function fetchLessonsByStudentAppIdFromSupabase(
  studentAppId: string,
): Promise<LessonsRepositoryResult<LessonsList>> {
  const lessonsResult = await fetchLessonsFromSupabase();

  if (!lessonsResult.ok) {
    return lessonsResult;
  }

  return {
    ok: true,
    data: lessonsResult.data.filter(
      (lesson) => lesson.studentId === studentAppId,
    ),
  };
}

export async function upsertLessonInSupabase(
  lesson: Lesson,
): Promise<LessonsRepositoryResult<Lesson>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const studentUuidResult = await resolveStudentUuid(lesson.studentId);

  if (!studentUuidResult.ok) {
    return studentUuidResult;
  }

  const uuidMapResult = await fetchLessonAppIdMap();

  if (!uuidMapResult.ok) {
    return uuidMapResult;
  }

  const lessonUuidByAppId = new Map<string, string>();
  for (const [uuid, appId] of uuidMapResult.data.entries()) {
    lessonUuidByAppId.set(appId, uuid);
  }

  const topicMapResult = await fetchTopicAppIdMap();
  if (!topicMapResult.ok) {
    return topicMapResult;
  }

  const client = getClient();
  const row = lessonToUpsertRow(
    lesson,
    studentUuidResult.data,
    lessonUuidByAppId,
    topicMapResult.data,
  );

  const { data, error } = await client
    .from('lessons')
    .upsert(row, { onConflict: 'app_id' })
    .select('id, app_id')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const inserted = data as Pick<LessonRow, 'id' | 'app_id'>;
  lessonUuidByAppId.set(inserted.app_id, inserted.id);

  const needsFkRetry =
    (lesson.transferredToLessonId &&
      !row.transferred_to_lesson_id &&
      lessonUuidByAppId.has(lesson.transferredToLessonId)) ||
    (lesson.makeupForLessonId &&
      !row.makeup_for_lesson_id &&
      lessonUuidByAppId.has(lesson.makeupForLessonId));

  if (needsFkRetry) {
    const retryRow = lessonToUpsertRow(
      lesson,
      studentUuidResult.data,
      lessonUuidByAppId,
      topicMapResult.data,
    );
    const { error: retryError } = await client
      .from('lessons')
      .update({
        makeup_for_lesson_id: retryRow.makeup_for_lesson_id,
        transferred_to_lesson_id: retryRow.transferred_to_lesson_id,
        transferred_from_lesson_id: retryRow.transferred_from_lesson_id,
      })
      .eq('app_id', lesson.id);

    if (retryError) {
      return { ok: false, error: retryError.message };
    }
  }

  return fetchLessonByAppId(lesson.id);
}

export async function upsertLessonsInSupabase(
  lessons: Lesson[],
): Promise<LessonsRepositoryResult<LessonsList>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const ordered = sortLessonsForUpsert(lessons);

  for (const lesson of ordered) {
    const result = await upsertLessonInSupabase(lesson);

    if (!result.ok) {
      return result;
    }
  }

  return fetchLessonsFromSupabase();
}

export async function updateLessonInSupabase(
  lessonAppId: string,
  patch: Partial<Lesson>,
): Promise<LessonsRepositoryResult<Lesson>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const uuidMapResult = await fetchLessonAppIdMap();

  if (!uuidMapResult.ok) {
    return uuidMapResult;
  }

  const lessonUuidByAppId = new Map<string, string>();
  for (const [uuid, appId] of uuidMapResult.data.entries()) {
    lessonUuidByAppId.set(appId, uuid);
  }

  const topicMapResult = await fetchTopicAppIdMap();
  if (!topicMapResult.ok) {
    return topicMapResult;
  }

  const updateRow = lessonPatchToUpdateRow(
    patch,
    lessonUuidByAppId,
    topicMapResult.data,
  );

  if (Object.keys(updateRow).length === 0) {
    return fetchLessonByAppId(lessonAppId);
  }

  const client = getClient();
  const { error } = await client
    .from('lessons')
    .update(updateRow)
    .eq('app_id', lessonAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return fetchLessonByAppId(lessonAppId);
}

export async function deleteLessonFromSupabase(
  lessonAppId: string,
): Promise<LessonsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { error } = await client
    .from('lessons')
    .delete()
    .eq('app_id', lessonAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: null };
}

export async function seedLessonsToSupabase(
  lessons: Lesson[],
): Promise<LessonsRepositoryResult<LessonsList>> {
  return upsertLessonsInSupabase(lessons);
}
