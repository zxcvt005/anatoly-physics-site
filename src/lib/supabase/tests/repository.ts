import 'server-only';

import {
  buildQuestionSnapshots,
  computeFinalStats,
  gradeAnswer,
  toStudentQuestion,
  validateQuestionInput,
  type QuestionSnapshot,
} from '@/lib/tests/grading';
import {
  normalizeSaveTestInput,
  resolveSaveTestVersion,
  shouldReplaceQuestionsInPlace,
} from '@/lib/tests/editor-persistence';
import {
  generateAssignmentId,
  generateAttemptId,
  generateOptionId,
  generateQuestionId,
  generateSectionId,
  generateTestId,
  generateTopicId,
} from '@/lib/tests/ids';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import {
  logRepositoryFailure,
  logSupabaseQueryFailure,
} from '@/lib/supabase/log-query-failure.server';
import { startCrmOperationTimer } from '@/lib/crm/diagnostics/log-failure.server';
import type {
  LessonTopic,
  LessonTopicSection,
  SaveTestInput,
  StudentAnswerValue,
  StudentHomeworkListItem,
  StudentIntensiveListItem,
  StudentTestQuestion,
  TestEditorBundle,
  TopicTestStats,
} from '@/types/tests';
import {
  extractAppId,
  lessonTopicToInsertRow,
  mapLessonTopicRow,
  mapLessonTopicSectionRow,
  mapTestAttemptRow,
  mapTestQuestionOptionRow,
  mapTestQuestionRow,
  mapTestSummaryRow,
} from './mappers';
import type {
  LessonTopicRow,
  LessonTopicSectionRow,
  TestAttemptAnswerRow,
  TestAttemptRow,
  TestQuestionOptionRow,
  TestQuestionRow,
  TestRow,
  TestsRepositoryResult,
} from './types';

function getClient() {
  return createSupabaseAdminClient();
}

function fail<T>(error: string): TestsRepositoryResult<T> {
  return { ok: false, error };
}

async function resolveByAppId(
  table: string,
  appId: string,
): Promise<TestsRepositoryResult<{ id: string; app_id: string }>> {
  const client = getClient();
  const { data, error } = await client
    .from(table)
    .select('id, app_id')
    .eq('app_id', appId)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!data) return fail(`${table} not found: ${appId}`);
  return { ok: true, data: data as { id: string; app_id: string } };
}

async function resolveStudentUuid(studentAppId: string) {
  return resolveByAppId('students', studentAppId);
}

async function resolveLessonUuid(lessonAppId: string) {
  return resolveByAppId('lessons', lessonAppId);
}

async function resolveTopicUuid(topicAppId: string) {
  return resolveByAppId('lesson_topics', topicAppId);
}

async function resolveSectionUuid(sectionAppId: string) {
  return resolveByAppId('lesson_topic_sections', sectionAppId);
}

const TOPIC_SELECT = '*, lesson_topic_sections(app_id, title, sort_order)';

async function resolveSectionUuidFromAppId(
  sectionAppId: string | null | undefined,
): Promise<TestsRepositoryResult<string | null>> {
  if (!sectionAppId) {
    return { ok: true, data: null };
  }

  const sectionResult = await resolveSectionUuid(sectionAppId);
  if (!sectionResult.ok) return sectionResult;
  return { ok: true, data: sectionResult.data.id };
}

async function getNextTopicSortOrder(sectionUuid: string | null): Promise<number> {
  const client = getClient();
  let query = client
    .from('lesson_topics')
    .select('sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (sectionUuid === null) {
    query = query.is('section_id', null);
  } else {
    query = query.eq('section_id', sectionUuid);
  }

  const { data } = await query.maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

async function resolveTestUuid(testAppId: string) {
  return resolveByAppId('tests', testAppId);
}

async function resolveAttemptUuid(attemptAppId: string) {
  return resolveByAppId('test_attempts', attemptAppId);
}

async function loadQuestionsForTest(
  testUuid: string,
  version: number,
): Promise<TestsRepositoryResult<{ questions: TestQuestionRow[]; options: TestQuestionOptionRow[] }>> {
  const client = getClient();
  const { data: questions, error: qError } = await client
    .from('test_questions')
    .select('*')
    .eq('test_id', testUuid)
    .eq('test_version', version)
    .order('sort_order', { ascending: true });

  if (qError) return fail(qError.message);

  const questionRows = (questions ?? []) as TestQuestionRow[];
  if (questionRows.length === 0) {
    return { ok: true, data: { questions: [], options: [] } };
  }

  const questionUuids = questionRows.map((row) => row.id);
  const { data: options, error: oError } = await client
    .from('test_question_options')
    .select('*')
    .in('question_id', questionUuids)
    .order('sort_order', { ascending: true });

  if (oError) return fail(oError.message);

  return {
    ok: true,
    data: {
      questions: questionRows,
      options: (options ?? []) as TestQuestionOptionRow[],
    },
  };
}

function parseSnapshot(row: TestAttemptRow): QuestionSnapshot[] {
  if (!Array.isArray(row.question_snapshot)) return [];
  return row.question_snapshot as QuestionSnapshot[];
}

// ---------------------------------------------------------------------------
// Topic sections
// ---------------------------------------------------------------------------

export async function fetchLessonTopicSectionsFromSupabase(): Promise<
  TestsRepositoryResult<LessonTopicSection[]>
> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const client = getClient();
  const { data, error } = await client
    .from('lesson_topic_sections')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) return fail(error.message);
  return {
    ok: true,
    data: ((data ?? []) as LessonTopicSectionRow[]).map(mapLessonTopicSectionRow),
  };
}

export async function insertLessonTopicSectionToSupabase(
  title: string,
): Promise<TestsRepositoryResult<LessonTopicSection>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const trimmed = title.trim();
  if (!trimmed) return fail('Title is required');

  const client = getClient();
  const { data: maxOrder } = await client
    .from('lesson_topic_sections')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const section = {
    app_id: generateSectionId(),
    title: trimmed,
    sort_order: (maxOrder?.sort_order ?? -1) + 1,
    is_active: true,
  };

  const { data, error } = await client
    .from('lesson_topic_sections')
    .insert(section)
    .select('*')
    .single();

  if (error) return fail(error.message);
  return { ok: true, data: mapLessonTopicSectionRow(data as LessonTopicSectionRow) };
}

export async function updateLessonTopicSectionTitleInSupabase(
  sectionAppId: string,
  title: string,
): Promise<TestsRepositoryResult<LessonTopicSection>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const trimmed = title.trim();
  if (!trimmed) return fail('Title is required');

  const client = getClient();
  const { data, error } = await client
    .from('lesson_topic_sections')
    .update({ title: trimmed })
    .eq('app_id', sectionAppId)
    .select('*')
    .single();

  if (error) return fail(error.message);
  return { ok: true, data: mapLessonTopicSectionRow(data as LessonTopicSectionRow) };
}

export async function reorderLessonTopicSectionsInSupabase(
  orderedSectionAppIds: string[],
): Promise<TestsRepositoryResult<LessonTopicSection[]>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const client = getClient();
  for (let index = 0; index < orderedSectionAppIds.length; index += 1) {
    const { error } = await client
      .from('lesson_topic_sections')
      .update({ sort_order: index })
      .eq('app_id', orderedSectionAppIds[index]);

    if (error) return fail(error.message);
  }

  return fetchLessonTopicSectionsFromSupabase();
}

export async function archiveLessonTopicSectionInSupabase(
  sectionAppId: string,
): Promise<TestsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const sectionResult = await resolveSectionUuid(sectionAppId);
  if (!sectionResult.ok) return sectionResult;

  const client = getClient();
  const sectionUuid = sectionResult.data.id;

  const { error: detachError } = await client
    .from('lesson_topics')
    .update({ section_id: null })
    .eq('section_id', sectionUuid);

  if (detachError) return fail(detachError.message);

  const { error } = await client
    .from('lesson_topic_sections')
    .update({ is_active: false })
    .eq('app_id', sectionAppId);

  if (error) return fail(error.message);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export async function fetchLessonTopicsFromSupabase(): Promise<
  TestsRepositoryResult<LessonTopic[]>
> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const client = getClient();
  const { data, error } = await client
    .from('lesson_topics')
    .select(TOPIC_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) return fail(error.message);
  return {
    ok: true,
    data: ((data ?? []) as LessonTopicRow[]).map(mapLessonTopicRow),
  };
}

export async function searchLessonTopicsFromSupabase(
  query: string,
): Promise<TestsRepositoryResult<LessonTopic[]>> {
  const all = await fetchLessonTopicsFromSupabase();
  if (!all.ok) return all;

  const normalized = query.trim().toLowerCase();
  if (!normalized) return all;

  return {
    ok: true,
    data: all.data.filter((topic) => topic.title.toLowerCase().includes(normalized)),
  };
}

export async function insertLessonTopicToSupabase(
  title: string,
  sectionAppId?: string | null,
): Promise<TestsRepositoryResult<LessonTopic>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const trimmed = title.trim();
  if (!trimmed) return fail('Title is required');

  const sectionUuidResult = await resolveSectionUuidFromAppId(sectionAppId);
  if (!sectionUuidResult.ok) return sectionUuidResult;

  const sectionUuid = sectionUuidResult.data;
  const sortOrder = await getNextTopicSortOrder(sectionUuid);

  const topic: LessonTopic = {
    id: generateTopicId(),
    title: trimmed,
    sortOrder,
    isActive: true,
    sectionId: sectionAppId ?? null,
  };

  const client = getClient();
  const { data, error } = await client
    .from('lesson_topics')
    .insert(lessonTopicToInsertRow(topic, sectionUuid))
    .select(TOPIC_SELECT)
    .single();

  if (error) return fail(error.message);
  return { ok: true, data: mapLessonTopicRow(data as LessonTopicRow) };
}

export async function updateLessonTopicTitleInSupabase(
  topicAppId: string,
  title: string,
): Promise<TestsRepositoryResult<LessonTopic>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const trimmed = title.trim();
  if (!trimmed) return fail('Title is required');

  const client = getClient();
  const { data, error } = await client
    .from('lesson_topics')
    .update({ title: trimmed })
    .eq('app_id', topicAppId)
    .select(TOPIC_SELECT)
    .single();

  if (error) return fail(error.message);
  return { ok: true, data: mapLessonTopicRow(data as LessonTopicRow) };
}

export async function updateLessonTopicSectionInSupabase(
  topicAppId: string,
  sectionAppId: string | null,
): Promise<TestsRepositoryResult<LessonTopic>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const sectionUuidResult = await resolveSectionUuidFromAppId(sectionAppId);
  if (!sectionUuidResult.ok) return sectionUuidResult;

  const sectionUuid = sectionUuidResult.data;
  const sortOrder = await getNextTopicSortOrder(sectionUuid);

  const client = getClient();
  const { data, error } = await client
    .from('lesson_topics')
    .update({ section_id: sectionUuid, sort_order: sortOrder })
    .eq('app_id', topicAppId)
    .select(TOPIC_SELECT)
    .single();

  if (error) return fail(error.message);
  return { ok: true, data: mapLessonTopicRow(data as LessonTopicRow) };
}

export async function reorderLessonTopicsInSupabase(
  orderedTopicAppIds: string[],
): Promise<TestsRepositoryResult<LessonTopic[]>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const client = getClient();
  for (let index = 0; index < orderedTopicAppIds.length; index += 1) {
    const { error } = await client
      .from('lesson_topics')
      .update({ sort_order: index })
      .eq('app_id', orderedTopicAppIds[index]);

    if (error) return fail(error.message);
  }

  return fetchLessonTopicsFromSupabase();
}

export async function archiveLessonTopicInSupabase(
  topicAppId: string,
): Promise<TestsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const client = getClient();
  const { error } = await client
    .from('lesson_topics')
    .update({ is_active: false })
    .eq('app_id', topicAppId);

  if (error) return fail(error.message);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Test editor (homework by topic / intensive)
// ---------------------------------------------------------------------------

export async function fetchHomeworkTestByTopicFromSupabase(
  topicAppId: string,
): Promise<TestsRepositoryResult<TestEditorBundle | null>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const topicResult = await resolveTopicUuid(topicAppId);
  if (!topicResult.ok) return topicResult;

  const client = getClient();
  const { data: testRow, error } = await client
    .from('tests')
    .select('*')
    .eq('lesson_topic_id', topicResult.data.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!testRow) return { ok: true, data: null };

  return loadTestEditorBundle(testRow as TestRow, topicAppId);
}

async function loadTestEditorBundle(
  testRow: TestRow,
  topicAppId?: string,
  intensiveAppId?: string,
): Promise<TestsRepositoryResult<TestEditorBundle>> {
  const loaded = await loadQuestionsForTest(testRow.id, testRow.version);
  if (!loaded.ok) return loaded;

  const mappedQuestions = loaded.data.questions.map((row) =>
    mapTestQuestionRow(
      row,
      loaded.data.options.filter((option) => option.question_id === row.id),
    ),
  );

  const maxPoints = mappedQuestions.reduce((sum, q) => sum + q.maxPoints, 0);

  return {
    ok: true,
    data: {
      test: {
        ...mapTestSummaryRow(testRow, mappedQuestions.length, maxPoints),
        lessonTopicId: topicAppId,
        intensiveId: intensiveAppId,
      },
      questions: mappedQuestions,
    },
  };
}

export async function saveHomeworkTestForTopicInSupabase(
  topicAppId: string,
  input: SaveTestInput,
): Promise<TestsRepositoryResult<TestEditorBundle>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const topicResult = await resolveTopicUuid(topicAppId);
  if (!topicResult.ok) return topicResult;

  const client = getClient();
  const { data: existing } = await client
    .from('tests')
    .select('*')
    .eq('lesson_topic_id', topicResult.data.id)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    return saveTestQuestions(existing as TestRow, input, topicAppId);
  }

  const testAppId = generateTestId();
  const { data: created, error } = await client
    .from('tests')
    .insert({
      app_id: testAppId,
      test_type: 'homework',
      title: input.title.trim() || 'Домашнее задание',
      lesson_topic_id: topicResult.data.id,
      version: 1,
      is_active: true,
      is_published: true,
    })
    .select('*')
    .single();

  if (error) return fail(error.message);
  return saveTestQuestions(created as TestRow, input, topicAppId);
}

async function deleteQuestionsForTestVersion(
  client: ReturnType<typeof getClient>,
  testUuid: string,
  version: number,
): Promise<string | null> {
  const { error } = await client
    .from('test_questions')
    .delete()
    .eq('test_id', testUuid)
    .eq('test_version', version);

  return error?.message ?? null;
}

async function saveTestQuestions(
  testRow: TestRow,
  input: SaveTestInput,
  topicAppId?: string,
  intensiveAppId?: string,
): Promise<TestsRepositoryResult<TestEditorBundle>> {
  const normalized = normalizeSaveTestInput(input);

  for (const question of normalized.questions) {
    if (!question.promptText.trim()) {
      return fail('Each question must have a prompt');
    }

    const validationError = validateQuestionInput(
      question.questionType,
      question.config,
      question.options.map((option) => ({
        id: option.id ?? generateOptionId(),
        sortOrder: option.sortOrder,
        labelText: option.labelText,
        isCorrect: option.isCorrect,
        matchKey: option.matchKey,
      })),
    );
    if (validationError) return fail(validationError);
  }

  const client = getClient();

  const { count: attemptCount } = await client
    .from('test_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('test_id', testRow.id);

  const nextVersion = resolveSaveTestVersion(
    testRow.version,
    (attemptCount ?? 0) > 0,
  );
  const replaceInPlace = shouldReplaceQuestionsInPlace(nextVersion, testRow.version);

  if (replaceInPlace) {
    const deleteError = await deleteQuestionsForTestVersion(
      client,
      testRow.id,
      nextVersion,
    );
    if (deleteError) return fail(deleteError);
  }

  for (const question of normalized.questions) {
    const questionAppId = question.id ?? generateQuestionId();
    const { data: qRow, error: qError } = await client
      .from('test_questions')
      .insert({
        app_id: questionAppId,
        test_id: testRow.id,
        test_version: nextVersion,
        sort_order: question.sortOrder,
        question_type: question.questionType,
        prompt_text: question.promptText,
        image_url: question.imageUrl ?? null,
        max_points: question.maxPoints,
        config: question.config,
      })
      .select('*')
      .single();

    if (qError) return fail(qError.message);

    for (const option of question.options) {
      const { error: oError } = await client.from('test_question_options').insert({
        app_id: option.id ?? generateOptionId(),
        question_id: (qRow as TestQuestionRow).id,
        sort_order: option.sortOrder,
        label_text: option.labelText.trim(),
        is_correct: option.isCorrect ?? false,
        match_key: option.matchKey ?? null,
      });

      if (oError) return fail(oError.message);
    }
  }

  const { error: testUpdateError } = await client
    .from('tests')
    .update({
      title: normalized.title || testRow.title,
      is_published: true,
      version: nextVersion,
    })
    .eq('id', testRow.id);

  if (testUpdateError) return fail(testUpdateError.message);

  const refreshed = await client.from('tests').select('*').eq('id', testRow.id).single();
  if (refreshed.error) return fail(refreshed.error.message);

  return loadTestEditorBundle(refreshed.data as TestRow, topicAppId, intensiveAppId);
}

export async function fetchIntensiveTestFromSupabase(
  intensiveAppId: string,
): Promise<TestsRepositoryResult<TestEditorBundle | null>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const intensiveResult = await resolveByAppId('intensives', intensiveAppId);
  if (!intensiveResult.ok) return intensiveResult;

  const client = getClient();
  const { data: testRow, error } = await client
    .from('tests')
    .select('*')
    .eq('intensive_id', intensiveResult.data.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return fail(error.message);
  if (!testRow) return { ok: true, data: null };

  return loadTestEditorBundle(testRow as TestRow, undefined, intensiveAppId);
}

export async function saveIntensiveTestInSupabase(
  intensiveAppId: string,
  input: SaveTestInput,
): Promise<TestsRepositoryResult<TestEditorBundle>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const intensiveResult = await resolveByAppId('intensives', intensiveAppId);
  if (!intensiveResult.ok) return intensiveResult;

  const client = getClient();
  const { data: existing } = await client
    .from('tests')
    .select('*')
    .eq('intensive_id', intensiveResult.data.id)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    return saveTestQuestions(existing as TestRow, input, undefined, intensiveAppId);
  }

  const { data: intensive } = await client
    .from('intensives')
    .select('title')
    .eq('id', intensiveResult.data.id)
    .single();

  const { data: created, error } = await client
    .from('tests')
    .insert({
      app_id: generateTestId(),
      test_type: 'intensive',
      title: input.title.trim() || intensive?.title || 'Интенсив',
      intensive_id: intensiveResult.data.id,
      version: 1,
      is_active: true,
      is_published: true,
    })
    .select('*')
    .single();

  if (error) return fail(error.message);
  return saveTestQuestions(created as TestRow, input, undefined, intensiveAppId);
}

// ---------------------------------------------------------------------------
// Assignments on lesson marking
// ---------------------------------------------------------------------------

export async function createLessonHomeworkAssignmentInSupabase(input: {
  studentAppId: string;
  lessonAppId: string;
  topicAppId: string;
}): Promise<TestsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const [studentResult, lessonResult, topicResult] = await Promise.all([
    resolveStudentUuid(input.studentAppId),
    resolveLessonUuid(input.lessonAppId),
    resolveTopicUuid(input.topicAppId),
  ]);

  if (!studentResult.ok) return studentResult;
  if (!lessonResult.ok) return lessonResult;
  if (!topicResult.ok) return topicResult;

  const client = getClient();

  const { data: testRow, error: testError } = await client
    .from('tests')
    .select('*')
    .eq('lesson_topic_id', topicResult.data.id)
    .eq('is_active', true)
    .eq('is_published', true)
    .maybeSingle();

  if (testError) return fail(testError.message);

  const { error: lessonUpdateError } = await client
    .from('lessons')
    .update({
      lesson_topic_id: topicResult.data.id,
      homework_points_earned: null,
      homework_points_max: null,
      homework_percent: null,
    })
    .eq('id', lessonResult.data.id);

  if (lessonUpdateError) return fail(lessonUpdateError.message);

  if (!testRow) {
    return { ok: true, data: null };
  }

  const { data: existingAssignment } = await client
    .from('test_assignments')
    .select('id')
    .eq('lesson_id', lessonResult.data.id)
    .eq('student_id', studentResult.data.id)
    .eq('source', 'lesson')
    .maybeSingle();

  if (existingAssignment) {
    return { ok: true, data: null };
  }

  const { error: assignmentError } = await client.from('test_assignments').insert({
    app_id: generateAssignmentId(),
    test_id: (testRow as TestRow).id,
    student_id: studentResult.data.id,
    lesson_id: lessonResult.data.id,
    status: 'assigned',
    source: 'lesson',
  });

  if (assignmentError) return fail(assignmentError.message);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Student lists
// ---------------------------------------------------------------------------

export async function fetchStudentHomeworkListFromSupabase(
  studentAppId: string,
): Promise<TestsRepositoryResult<StudentHomeworkListItem[]>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const studentResult = await resolveStudentUuid(studentAppId);
  if (!studentResult.ok) return studentResult;

  const client = getClient();
  const [sectionsResult, topicsResult, assignmentsResult, attemptsResult, testsResult] =
    await Promise.all([
      client
        .from('lesson_topic_sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      client
        .from('lesson_topics')
        .select(TOPIC_SELECT)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      client
        .from('test_assignments')
        .select('*, tests(app_id, lesson_topic_id, lesson_topics(app_id)), lessons(app_id, lesson_at)')
        .eq('student_id', studentResult.data.id),
      client
        .from('test_attempts')
        .select('*, tests(app_id, test_type, lesson_topic_id, lesson_topics(app_id))')
        .eq('student_id', studentResult.data.id),
      client
        .from('tests')
        .select('*, lesson_topics(app_id, title)')
        .eq('test_type', 'homework')
        .eq('is_active', true)
        .eq('is_published', true),
    ]);

  if (sectionsResult.error) return fail(sectionsResult.error.message);
  if (topicsResult.error) return fail(topicsResult.error.message);
  if (assignmentsResult.error) return fail(assignmentsResult.error.message);
  if (attemptsResult.error) return fail(attemptsResult.error.message);
  if (testsResult.error) return fail(testsResult.error.message);

  const sectionTitleByAppId = new Map<string, string>();
  const sectionSortByAppId = new Map<string, number>();
  const topicSortByAppId = new Map<string, number>();
  for (const sectionRow of (sectionsResult.data ?? []) as LessonTopicSectionRow[]) {
    sectionTitleByAppId.set(sectionRow.app_id, sectionRow.title);
    sectionSortByAppId.set(sectionRow.app_id, sectionRow.sort_order);
  }

  const testsByTopic = new Map<string, { testAppId: string }>();
  for (const test of testsResult.data ?? []) {
    const topicAppId = extractAppId(
      (test as { lesson_topics: { app_id: string } | null }).lesson_topics,
    );
    if (topicAppId) {
      testsByTopic.set(topicAppId, { testAppId: (test as TestRow).app_id });
    }
  }

  const items: StudentHomeworkListItem[] = [];

  for (const topicRow of (topicsResult.data ?? []) as LessonTopicRow[]) {
    const topic = mapLessonTopicRow(topicRow);
    const topicAppId = topic.id;
    topicSortByAppId.set(topicAppId, topic.sortOrder);
    const testInfo = testsByTopic.get(topicAppId);

    const lessonAssignment = (assignmentsResult.data ?? []).find((row) => {
      const topicId = extractAppId(
        (row as { tests: { lesson_topics: { app_id: string } | null } }).tests
          ?.lesson_topics,
      );
      return topicId === topicAppId && (row as { source: string }).source === 'lesson';
    }) as
      | ({
          id: string;
          app_id: string;
          status: StudentHomeworkListItem['status'];
          lessons: { app_id: string; lesson_at: string } | null;
        } & Record<string, unknown>)
      | undefined;

    const selfAssignment = (assignmentsResult.data ?? []).find((row) => {
      const topicId = extractAppId(
        (row as { tests: { lesson_topics: { app_id: string } | null } }).tests
          ?.lesson_topics,
      );
      return topicId === topicAppId && (row as { source: string }).source === 'self';
    }) as
      | ({
          id: string;
          app_id: string;
          status: StudentHomeworkListItem['status'];
        } & Record<string, unknown>)
      | undefined;

    const topicAttempts = (attemptsResult.data ?? []).filter((row) => {
      const topicId = extractAppId(
        (row as { tests: { lesson_topics: { app_id: string } | null } }).tests
          ?.lesson_topics,
      );
      return topicId === topicAppId;
    }) as TestAttemptRow[];

    const lessonAttempts = lessonAssignment
      ? topicAttempts.filter((row) => row.assignment_id === lessonAssignment.id)
      : [];
    const selfAttempts = selfAssignment
      ? topicAttempts.filter((row) => row.assignment_id === selfAssignment.id)
      : topicAttempts.filter((row) => !row.assignment_id);

    const pickLatestCompleted = (rows: TestAttemptRow[]) =>
      rows
        .filter((row) => row.stage === 'completed')
        .sort(
          (a, b) =>
            new Date(b.completed_at ?? 0).getTime() -
            new Date(a.completed_at ?? 0).getTime(),
        )[0];

    const pickActive = (rows: TestAttemptRow[]) =>
      rows.find((row) => row.stage !== 'completed');

    let status: StudentHomeworkListItem['status'] = 'not_started';
    let source: StudentHomeworkListItem['source'] | undefined;
    let assignmentId: string | undefined;
    let attemptId: string | undefined;
    let finalScore: number | undefined;
    let finalMaxScore: number | undefined;
    let finalPercent: number | undefined;
    let completedAt: string | undefined;

    if (lessonAssignment) {
      source = 'lesson';
      assignmentId = lessonAssignment.app_id;
      const activeAttempt = pickActive(lessonAttempts);
      const completedAttempt = pickLatestCompleted(lessonAttempts);

      if (completedAttempt || lessonAssignment.status === 'completed') {
        status = 'completed';
        const resultAttempt = completedAttempt ?? pickLatestCompleted(lessonAttempts);
        attemptId = resultAttempt?.app_id;
        if (resultAttempt) {
          finalScore =
            resultAttempt.final_score !== null
              ? Number(resultAttempt.final_score)
              : undefined;
          finalMaxScore =
            resultAttempt.final_max_score !== null
              ? Number(resultAttempt.final_max_score)
              : undefined;
          finalPercent =
            resultAttempt.final_percent !== null
              ? Number(resultAttempt.final_percent)
              : undefined;
          completedAt = resultAttempt.completed_at ?? undefined;
        }
      } else if (activeAttempt || lessonAssignment.status === 'in_progress') {
        status = 'in_progress';
        attemptId = activeAttempt?.app_id;
      } else {
        status = 'assigned';
      }
    } else {
      const activeAttempt = pickActive(selfAttempts);
      const completedAttempt = pickLatestCompleted(selfAttempts);

      if (selfAssignment || activeAttempt || completedAttempt) {
        source = 'self';
        assignmentId = selfAssignment?.app_id;
      }

      if (completedAttempt) {
        status = 'completed';
        attemptId = completedAttempt.app_id;
        finalScore =
          completedAttempt.final_score !== null
            ? Number(completedAttempt.final_score)
            : undefined;
        finalMaxScore =
          completedAttempt.final_max_score !== null
            ? Number(completedAttempt.final_max_score)
            : undefined;
        finalPercent =
          completedAttempt.final_percent !== null
            ? Number(completedAttempt.final_percent)
            : undefined;
        completedAt = completedAttempt.completed_at ?? undefined;
      } else if (activeAttempt || selfAssignment?.status === 'in_progress') {
        status = 'in_progress';
        attemptId = activeAttempt?.app_id;
      } else {
        status = 'not_started';
      }
    }

    const lessonRel = lessonAssignment?.lessons ?? null;

    items.push({
      topicId: topicAppId,
      topicTitle: topic.title,
      sectionId: topic.sectionId ?? null,
      sectionTitle: topic.sectionId
        ? sectionTitleByAppId.get(topic.sectionId) ?? topic.sectionTitle
        : undefined,
      sectionSortOrder: topic.sectionId
        ? sectionSortByAppId.get(topic.sectionId)
        : Number.MAX_SAFE_INTEGER,
      testId: testInfo?.testAppId,
      assignmentId,
      attemptId,
      lessonId: lessonRel?.app_id,
      lessonDate: lessonRel?.lesson_at,
      status,
      source,
      finalScore,
      finalMaxScore,
      finalPercent,
      completedAt,
    });
  }

  items.sort((a, b) => {
    const sectionDiff =
      (a.sectionSortOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.sectionSortOrder ?? Number.MAX_SAFE_INTEGER);
    if (sectionDiff !== 0) return sectionDiff;
    return (topicSortByAppId.get(a.topicId) ?? 0) - (topicSortByAppId.get(b.topicId) ?? 0);
  });

  return { ok: true, data: items };
}

export async function fetchStudentIntensiveListFromSupabase(
  studentAppId: string,
): Promise<TestsRepositoryResult<StudentIntensiveListItem[]>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const studentResult = await resolveStudentUuid(studentAppId);
  if (!studentResult.ok) return studentResult;

  const client = getClient();
  const [intensivesResult, testsResult, attemptsResult] = await Promise.all([
    client.from('intensives').select('*').order('title', { ascending: true }),
    client
      .from('tests')
      .select('*')
      .eq('test_type', 'intensive')
      .eq('is_active', true)
      .eq('is_published', true),
    client
      .from('test_attempts')
      .select('*, tests(app_id, intensive_id, intensives(app_id))')
      .eq('student_id', studentResult.data.id),
  ]);

  if (intensivesResult.error) return fail(intensivesResult.error.message);
  if (testsResult.error) return fail(testsResult.error.message);
  if (attemptsResult.error) return fail(attemptsResult.error.message);

  const testsByIntensive = new Map<string, TestRow>();
  for (const test of testsResult.data ?? []) {
    const row = test as TestRow & { intensives: { app_id: string } | null };
    const intensiveAppId = extractAppId(row.intensives);
    if (intensiveAppId) testsByIntensive.set(intensiveAppId, row);
  }

  return {
    ok: true,
    data: (intensivesResult.data ?? []).map((intensive) => {
      const intensiveAppId = (intensive as { app_id: string }).app_id;
      const test = testsByIntensive.get(intensiveAppId);
      const attempts = (attemptsResult.data ?? []).filter((row) => {
        const iid = extractAppId(
          (row as { tests: { intensives: { app_id: string } | null } }).tests?.intensives,
        );
        return iid === intensiveAppId;
      }) as TestAttemptRow[];

      const completed = attempts
        .filter((row) => row.stage === 'completed')
        .sort(
          (a, b) =>
            new Date(b.completed_at ?? 0).getTime() -
            new Date(a.completed_at ?? 0).getTime(),
        )[0];
      const active = attempts.find((row) => row.stage !== 'completed');

      let status: StudentIntensiveListItem['status'] = 'not_started';
      if (completed) status = 'completed';
      else if (active) status = 'in_progress';

      return {
        intensiveId: intensiveAppId,
        intensiveTitle: (intensive as { title: string }).title,
        testId: test?.app_id,
        attemptId: active?.app_id ?? completed?.app_id,
        status,
        finalScore:
          completed?.final_score !== null && completed?.final_score !== undefined
            ? Number(completed.final_score)
            : undefined,
        finalMaxScore:
          completed?.final_max_score !== null && completed?.final_max_score !== undefined
            ? Number(completed.final_max_score)
            : undefined,
        finalPercent:
          completed?.final_percent !== null && completed?.final_percent !== undefined
            ? Number(completed.final_percent)
            : undefined,
        completedAt: completed?.completed_at ?? undefined,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

export async function startTestAttemptInSupabase(input: {
  studentAppId: string;
  testAppId: string;
  assignmentAppId?: string;
  source: 'lesson' | 'self';
}): Promise<
  TestsRepositoryResult<{
    attemptId: string;
    stage: TestAttemptRow['stage'];
    questions: StudentTestQuestion[];
  }>
> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const [studentResult, testResult] = await Promise.all([
    resolveStudentUuid(input.studentAppId),
    resolveTestUuid(input.testAppId),
  ]);
  if (!studentResult.ok) return studentResult;
  if (!testResult.ok) return testResult;

  const client = getClient();
  const { data: testRow, error: testError } = await client
    .from('tests')
    .select('*')
    .eq('id', testResult.data.id)
    .single();

  if (testError) return fail(testError.message);
  const test = testRow as TestRow;

  const loaded = await loadQuestionsForTest(test.id, test.version);
  if (!loaded.ok) return loaded;

  const mappedQuestions = loaded.data.questions.map((row) =>
    mapTestQuestionRow(
      row,
      loaded.data.options.filter((option) => option.question_id === row.id),
    ),
  );

  if (mappedQuestions.length === 0) {
    return fail('Test has no questions');
  }

  const snapshots = buildQuestionSnapshots(mappedQuestions);

  let assignmentUuid: string | null = null;
  if (input.assignmentAppId) {
    const asg = await resolveByAppId('test_assignments', input.assignmentAppId);
    if (!asg.ok) return asg;
    assignmentUuid = asg.data.id;
  } else if (input.source === 'self' && test.test_type === 'homework') {
    const { data: existingSelfAssignment, error: existingSelfError } = await client
      .from('test_assignments')
      .select('id')
      .eq('test_id', test.id)
      .eq('student_id', studentResult.data.id)
      .eq('source', 'self')
      .in('status', ['assigned', 'in_progress'])
      .maybeSingle();

    if (existingSelfError) return fail(existingSelfError.message);

    if (existingSelfAssignment) {
      assignmentUuid = existingSelfAssignment.id;
    } else {
      const { data: createdAsg, error: asgError } = await client
        .from('test_assignments')
        .insert({
          app_id: generateAssignmentId(),
          test_id: test.id,
          student_id: studentResult.data.id,
          lesson_id: null,
          status: 'in_progress',
          source: 'self',
        })
        .select('id')
        .single();

      if (asgError) return fail(asgError.message);
      assignmentUuid = createdAsg.id;
    }
  }

  if (assignmentUuid) {
    const { data: existingAttempt, error: existingAttemptError } = await client
      .from('test_attempts')
      .select('*')
      .eq('assignment_id', assignmentUuid)
      .neq('stage', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAttemptError) return fail(existingAttemptError.message);

    if (existingAttempt) {
      const resumeResult = await fetchAttemptForStudentFromSupabase({
        studentAppId: input.studentAppId,
        attemptAppId: (existingAttempt as TestAttemptRow).app_id,
      });
      if (!resumeResult.ok) return resumeResult;

      return {
        ok: true,
        data: {
          attemptId: resumeResult.data.attempt.id,
          stage: resumeResult.data.attempt.stage,
          questions: resumeResult.data.questions,
        },
      };
    }
  }

  const attemptAppId = generateAttemptId();
  const { data: attemptRow, error: attemptError } = await client
    .from('test_attempts')
    .insert({
      app_id: attemptAppId,
      test_id: test.id,
      test_version: test.version,
      student_id: studentResult.data.id,
      assignment_id: assignmentUuid,
      stage: 'draft_1',
      question_snapshot: snapshots,
    })
    .select('*')
    .single();

  if (attemptError) return fail(attemptError.message);

  if (assignmentUuid) {
    await client
      .from('test_assignments')
      .update({ status: 'in_progress' })
      .eq('id', assignmentUuid);
  }

  return {
    ok: true,
    data: {
      attemptId: attemptAppId,
      stage: (attemptRow as TestAttemptRow).stage,
      questions: mappedQuestions.map(toStudentQuestion),
    },
  };
}

export async function saveAttemptDraftInSupabase(input: {
  studentAppId: string;
  attemptAppId: string;
  attemptNumber: 1 | 2;
  answers: Array<{ questionId: string; answer: StudentAnswerValue }>;
}): Promise<TestsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const [studentResult, attemptResult] = await Promise.all([
    resolveStudentUuid(input.studentAppId),
    resolveAttemptUuid(input.attemptAppId),
  ]);
  if (!studentResult.ok) return studentResult;
  if (!attemptResult.ok) return attemptResult;

  const client = getClient();
  const { data: attemptRow, error } = await client
    .from('test_attempts')
    .select('*')
    .eq('id', attemptResult.data.id)
    .eq('student_id', studentResult.data.id)
    .single();

  if (error) return fail(error.message);
  const attempt = attemptRow as TestAttemptRow;

  const allowedStage =
    input.attemptNumber === 1 ? 'draft_1' : 'draft_2';
  if (attempt.stage !== allowedStage) {
    return fail('Attempt is not in draft stage');
  }

  for (const entry of input.answers) {
    const { error: upsertError } = await client.from('test_attempt_answers').upsert(
      {
        attempt_id: attempt.id,
        question_id: entry.questionId,
        attempt_number: input.attemptNumber,
        answer: entry.answer,
        is_unknown: entry.answer.type === 'unknown',
      },
      { onConflict: 'attempt_id,question_id,attempt_number' },
    );

    if (upsertError) return fail(upsertError.message);
  }

  return { ok: true, data: null };
}

export async function submitAttemptOneInSupabase(input: {
  studentAppId: string;
  attemptAppId: string;
  answers: Array<{ questionId: string; answer: StudentAnswerValue }>;
}): Promise<
  TestsRepositoryResult<{
    stage: TestAttemptRow['stage'];
    firstAttemptCorrect: number;
    firstAttemptTotal: number;
    wrongQuestionIds: string[];
    questions: StudentTestQuestion[];
    stats?: ReturnType<typeof computeFinalStats>;
  }>
> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  await saveAttemptDraftInSupabase({
    studentAppId: input.studentAppId,
    attemptAppId: input.attemptAppId,
    attemptNumber: 1,
    answers: input.answers,
  });

  const [studentResult, attemptResult] = await Promise.all([
    resolveStudentUuid(input.studentAppId),
    resolveAttemptUuid(input.attemptAppId),
  ]);
  if (!studentResult.ok) return studentResult;
  if (!attemptResult.ok) return attemptResult;

  const client = getClient();
  const { data: attemptRow, error } = await client
    .from('test_attempts')
    .select('*')
    .eq('id', attemptResult.data.id)
    .eq('student_id', studentResult.data.id)
    .single();

  if (error) return fail(error.message);
  const attempt = attemptRow as TestAttemptRow;
  if (attempt.stage !== 'draft_1') return fail('First attempt already submitted');

  const snapshots = parseSnapshot(attempt);
  const answerMap = new Map(input.answers.map((entry) => [entry.questionId, entry.answer]));

  let firstAttemptCorrect = 0;
  const wrongQuestionIds: string[] = [];

  for (const question of snapshots) {
    const graded = gradeAnswer(question, answerMap.get(question.id), question.maxPoints);

    if (graded.isCorrect) firstAttemptCorrect += 1;
    else wrongQuestionIds.push(question.id);

    const { error: upsertError } = await client.from('test_attempt_answers').upsert(
      {
        attempt_id: attempt.id,
        question_id: question.id,
        attempt_number: 1,
        answer: answerMap.get(question.id) ?? null,
        is_correct: graded.isCorrect,
        is_unknown: false,
        points_earned: graded.pointsEarned,
        first_attempt_was_wrong: !graded.isCorrect,
      },
      { onConflict: 'attempt_id,question_id,attempt_number' },
    );

    if (upsertError) return fail(upsertError.message);
  }

  const nextStage = wrongQuestionIds.length === 0 ? 'completed' : 'draft_2';

  if (nextStage === 'completed') {
    const stats = computeFinalStats({
      questions: snapshots,
      firstAttemptAnswers: new Map(
        snapshots.map((question) => {
          const graded = gradeAnswer(question, answerMap.get(question.id), question.maxPoints);
          return [question.id, graded];
        }),
      ),
      secondAttemptAnswers: new Map(),
    });

    await finalizeAttempt(client, attempt, stats);

    return {
      ok: true,
      data: {
        stage: 'completed' as const,
        firstAttemptCorrect,
        firstAttemptTotal: snapshots.length,
        wrongQuestionIds,
        questions: [],
        stats,
      },
    };
  } else {
    await client
      .from('test_attempts')
      .update({
        stage: 'draft_2',
        first_attempt_correct: firstAttemptCorrect,
        first_attempt_total: snapshots.length,
      })
      .eq('id', attempt.id);
  }

  const wrongQuestions = snapshots
    .filter((question) => wrongQuestionIds.includes(question.id))
    .map(toStudentQuestion);

  return {
    ok: true,
    data: {
      stage: 'draft_2',
      firstAttemptCorrect,
      firstAttemptTotal: snapshots.length,
      wrongQuestionIds,
      questions: wrongQuestions,
    },
  };
}

async function finalizeAttempt(
  client: ReturnType<typeof getClient>,
  attempt: TestAttemptRow,
  stats: ReturnType<typeof computeFinalStats>,
) {
  await client
    .from('test_attempts')
    .update({
      stage: 'completed',
      first_attempt_correct: stats.firstAttemptCorrect,
      first_attempt_total: stats.firstAttemptTotal,
      second_attempt_fixed: stats.secondAttemptFixed,
      second_attempt_unknown: stats.secondAttemptUnknown,
      final_score: stats.finalScore,
      final_max_score: stats.finalMaxScore,
      final_percent: stats.finalPercent,
      completed_at: new Date().toISOString(),
    })
    .eq('id', attempt.id);

  if (attempt.assignment_id) {
    await client
      .from('test_assignments')
      .update({ status: 'completed' })
      .eq('id', attempt.assignment_id);

    const { data: assignment } = await client
      .from('test_assignments')
      .select('lesson_id, source')
      .eq('id', attempt.assignment_id)
      .maybeSingle();

    if (assignment?.lesson_id && assignment.source === 'lesson') {
      await client
        .from('lessons')
        .update({
          homework_points_earned: stats.finalScore,
          homework_points_max: stats.finalMaxScore,
          homework_percent: stats.finalPercent,
        })
        .eq('id', assignment.lesson_id);
    }
  }
}

export async function submitAttemptTwoInSupabase(input: {
  studentAppId: string;
  attemptAppId: string;
  answers: Array<{ questionId: string; answer: StudentAnswerValue }>;
}): Promise<
  TestsRepositoryResult<{
    stage: 'completed';
    stats: ReturnType<typeof computeFinalStats>;
  }>
> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const [studentResult, attemptResult] = await Promise.all([
    resolveStudentUuid(input.studentAppId),
    resolveAttemptUuid(input.attemptAppId),
  ]);
  if (!studentResult.ok) return studentResult;
  if (!attemptResult.ok) return attemptResult;

  const client = getClient();
  const { data: attemptRow, error } = await client
    .from('test_attempts')
    .select('*')
    .eq('id', attemptResult.data.id)
    .eq('student_id', studentResult.data.id)
    .single();

  if (error) return fail(error.message);
  const attempt = attemptRow as TestAttemptRow;

  if (attempt.stage !== 'draft_2' && attempt.stage !== 'graded_1') {
    return fail('Second attempt is not available');
  }

  const snapshots = parseSnapshot(attempt);

  const { data: firstAnswers, error: firstError } = await client
    .from('test_attempt_answers')
    .select('*')
    .eq('attempt_id', attempt.id)
    .eq('attempt_number', 1);

  if (firstError) return fail(firstError.message);

  const firstMap = new Map<string, { isCorrect: boolean; pointsEarned: number }>();
  for (const row of (firstAnswers ?? []) as TestAttemptAnswerRow[]) {
    firstMap.set(row.question_id, {
      isCorrect: row.is_correct === true,
      pointsEarned: Number(row.points_earned ?? 0),
    });
  }

  const wrongQuestionIds = snapshots
    .filter((question) => !firstMap.get(question.id)?.isCorrect)
    .map((question) => question.id);

  const answerMap = new Map(input.answers.map((entry) => [entry.questionId, entry.answer]));

  for (const questionId of wrongQuestionIds) {
    const answer = answerMap.get(questionId);
    const isUnknown = answer?.type === 'unknown';

    let graded = { isCorrect: false, pointsEarned: 0 };
    if (!isUnknown && answer) {
      const question = snapshots.find((item) => item.id === questionId);
      if (question) {
        graded = gradeAnswer(question, answer, question.maxPoints);
      }
    }

    const { error: upsertError } = await client.from('test_attempt_answers').upsert(
      {
        attempt_id: attempt.id,
        question_id: questionId,
        attempt_number: 2,
        answer: answer ?? null,
        is_correct: isUnknown ? false : graded.isCorrect,
        is_unknown: isUnknown,
        points_earned: isUnknown ? 0 : graded.pointsEarned,
        first_attempt_was_wrong: true,
      },
      { onConflict: 'attempt_id,question_id,attempt_number' },
    );

    if (upsertError) return fail(upsertError.message);
  }

  const secondMap = new Map<
    string,
    { isCorrect: boolean; pointsEarned: number; isUnknown: boolean }
  >();

  for (const questionId of wrongQuestionIds) {
    const answer = answerMap.get(questionId);
    const isUnknown = answer?.type === 'unknown';
    const question = snapshots.find((item) => item.id === questionId);
    const graded =
      !isUnknown && answer && question
        ? gradeAnswer(question, answer, question.maxPoints)
        : { isCorrect: false, pointsEarned: 0 };

    secondMap.set(questionId, {
      isCorrect: graded.isCorrect,
      pointsEarned: graded.pointsEarned,
      isUnknown,
    });
  }

  const stats = computeFinalStats({
    questions: snapshots,
    firstAttemptAnswers: firstMap,
    secondAttemptAnswers: secondMap,
  });

  await finalizeAttempt(client, attempt, stats);

  return { ok: true, data: { stage: 'completed', stats } };
}

export async function fetchAttemptForStudentFromSupabase(input: {
  studentAppId: string;
  attemptAppId: string;
}): Promise<
  TestsRepositoryResult<{
    attempt: ReturnType<typeof mapTestAttemptRow>;
    questions: StudentTestQuestion[];
    draftAnswers: Array<{ questionId: string; answer: StudentAnswerValue }>;
    wrongQuestionIds: string[];
  }>
> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const [studentResult, attemptResult] = await Promise.all([
    resolveStudentUuid(input.studentAppId),
    resolveAttemptUuid(input.attemptAppId),
  ]);
  if (!studentResult.ok) return studentResult;
  if (!attemptResult.ok) return attemptResult;

  const client = getClient();
  const { data: attemptRow, error } = await client
    .from('test_attempts')
    .select('*, tests(app_id), test_assignments(app_id)')
    .eq('id', attemptResult.data.id)
    .eq('student_id', studentResult.data.id)
    .single();

  if (error) return fail(error.message);
  const attempt = attemptRow as TestAttemptRow & {
    tests: { app_id: string };
    test_assignments: { app_id: string } | null;
  };

  const snapshots = parseSnapshot(attempt);

  const { data: answers, error: answersError } = await client
    .from('test_attempt_answers')
    .select('*')
    .eq('attempt_id', attempt.id);

  if (answersError) return fail(answersError.message);

  const answerRows = (answers ?? []) as TestAttemptAnswerRow[];
  const attemptNumber = attempt.stage === 'draft_2' || attempt.stage === 'graded_1' ? 2 : 1;

  const draftAnswers = answerRows
    .filter((row) => row.attempt_number === (attemptNumber === 2 ? 2 : 1))
    .map((row) => ({
      questionId: row.question_id,
      answer: row.answer as StudentAnswerValue,
    }));

  const firstWrong = answerRows
    .filter((row) => row.attempt_number === 1 && row.is_correct === false)
    .map((row) => row.question_id);

  const visibleQuestions: StudentTestQuestion[] =
    attempt.stage === 'draft_2' || attempt.stage === 'graded_1'
      ? snapshots
          .filter((question) => firstWrong.includes(question.id))
          .map(toStudentQuestion)
      : snapshots.map(toStudentQuestion);

  return {
    ok: true,
    data: {
      attempt: mapTestAttemptRow(
        attempt,
        attempt.tests.app_id,
        input.studentAppId,
        attempt.test_assignments?.app_id,
      ),
      questions: visibleQuestions,
      draftAnswers,
      wrongQuestionIds: firstWrong,
    },
  };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function fetchTopicTestStatsFromSupabase(
  topicAppId: string,
): Promise<TestsRepositoryResult<TopicTestStats>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const topicResult = await resolveTopicUuid(topicAppId);
  if (!topicResult.ok) return topicResult;

  const client = getClient();
  const { data: topicRow } = await client
    .from('lesson_topics')
    .select('*')
    .eq('id', topicResult.data.id)
    .single();

  const { data: testRow } = await client
    .from('tests')
    .select('*')
    .eq('lesson_topic_id', topicResult.data.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!testRow) {
    return {
      ok: true,
      data: {
        topicId: topicAppId,
        topicTitle: (topicRow as LessonTopicRow).title,
        studentsAttempted: 0,
        studentsCompleted: 0,
        avgFirstAttemptPercent: null,
        avgFinalPercent: null,
        questions: [],
        studentResults: [],
      },
    };
  }

  const test = testRow as TestRow;
  const { data: attempts } = await client
    .from('test_attempts')
    .select('*, students(app_id, name)')
    .eq('test_id', test.id);

  const attemptRows = (attempts ?? []) as Array<
    TestAttemptRow & { students: { app_id: string; name: string } }
  >;

  const completed = attemptRows.filter((row) => row.stage === 'completed');
  const avgFinal =
    completed.length > 0
      ? completed.reduce((sum, row) => sum + Number(row.final_percent ?? 0), 0) /
        completed.length
      : null;

  const avgFirst =
    completed.length > 0
      ? completed.reduce((sum, row) => {
          const total = row.first_attempt_total ?? 0;
          const correct = row.first_attempt_correct ?? 0;
          return sum + (total > 0 ? (correct / total) * 100 : 0);
        }, 0) / completed.length
      : null;

  const loaded = await loadQuestionsForTest(test.id, test.version);
  if (!loaded.ok) return loaded;

  const questionStats = loaded.data.questions.map((questionRow) => {
    let firstCorrect = 0;
    let secondFixed = 0;
    let unknown = 0;
    let total = 0;

    for (const attempt of attemptRows) {
      if (attempt.stage !== 'completed') continue;
      total += 1;
    }

    return {
      questionId: questionRow.app_id,
      promptText: questionRow.prompt_text,
      firstAttemptCorrectPercent: total > 0 ? Math.round((firstCorrect / total) * 100) : 0,
      secondAttemptFixedPercent: total > 0 ? Math.round((secondFixed / total) * 100) : 0,
      unknownPercent: total > 0 ? Math.round((unknown / total) * 100) : 0,
    };
  });

  return {
    ok: true,
    data: {
      topicId: topicAppId,
      topicTitle: (topicRow as LessonTopicRow).title,
      studentsAttempted: attemptRows.length,
      studentsCompleted: completed.length,
      avgFirstAttemptPercent: avgFirst !== null ? Math.round(avgFirst * 100) / 100 : null,
      avgFinalPercent: avgFinal !== null ? Math.round(avgFinal * 100) / 100 : null,
      questions: questionStats,
      studentResults: completed.map((row) => ({
        studentId: row.students.app_id,
        studentName: row.students.name,
        firstAttemptCorrect: row.first_attempt_correct ?? undefined,
        firstAttemptTotal: row.first_attempt_total ?? undefined,
        finalScore: row.final_score !== null ? Number(row.final_score) : undefined,
        finalMaxScore:
          row.final_max_score !== null ? Number(row.final_max_score) : undefined,
        finalPercent: row.final_percent !== null ? Number(row.final_percent) : undefined,
        completedAt: row.completed_at ?? undefined,
      })),
    },
  };
}

export async function fetchIntensiveTestStatsFromSupabase(
  intensiveAppId: string,
): Promise<TestsRepositoryResult<TopicTestStats>> {
  if (!isSupabaseConfiguredOnServer()) return fail('Supabase is not configured');

  const intensiveResult = await resolveByAppId('intensives', intensiveAppId);
  if (!intensiveResult.ok) return intensiveResult;

  const client = getClient();
  const { data: intensive } = await client
    .from('intensives')
    .select('title')
    .eq('id', intensiveResult.data.id)
    .single();

  const { data: testRow } = await client
    .from('tests')
    .select('*')
    .eq('intensive_id', intensiveResult.data.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!testRow) {
    return {
      ok: true,
      data: {
        topicId: intensiveAppId,
        topicTitle: intensive?.title ?? 'Интенсив',
        studentsAttempted: 0,
        studentsCompleted: 0,
        avgFirstAttemptPercent: null,
        avgFinalPercent: null,
        questions: [],
        studentResults: [],
      },
    };
  }

  const test = testRow as TestRow;
  const { data: attempts } = await client
    .from('test_attempts')
    .select('*, students(app_id, name)')
    .eq('test_id', test.id);

  const attemptRows = (attempts ?? []) as Array<
    TestAttemptRow & { students: { app_id: string; name: string } }
  >;
  const completed = attemptRows.filter((row) => row.stage === 'completed');

  const avgFinal =
    completed.length > 0
      ? completed.reduce((sum, row) => sum + Number(row.final_percent ?? 0), 0) /
        completed.length
      : null;

  const avgFirst =
    completed.length > 0
      ? completed.reduce((sum, row) => {
          const total = row.first_attempt_total ?? 0;
          const correct = row.first_attempt_correct ?? 0;
          return sum + (total > 0 ? (correct / total) * 100 : 0);
        }, 0) / completed.length
      : null;

  return {
    ok: true,
    data: {
      topicId: intensiveAppId,
      topicTitle: intensive?.title ?? 'Интенсив',
      studentsAttempted: attemptRows.length,
      studentsCompleted: completed.length,
      avgFirstAttemptPercent: avgFirst !== null ? Math.round(avgFirst * 100) / 100 : null,
      avgFinalPercent: avgFinal !== null ? Math.round(avgFinal * 100) / 100 : null,
      questions: [],
      studentResults: completed.map((row) => ({
        studentId: row.students.app_id,
        studentName: row.students.name,
        firstAttemptCorrect: row.first_attempt_correct ?? undefined,
        firstAttemptTotal: row.first_attempt_total ?? undefined,
        finalScore: row.final_score !== null ? Number(row.final_score) : undefined,
        finalMaxScore:
          row.final_max_score !== null ? Number(row.final_max_score) : undefined,
        finalPercent: row.final_percent !== null ? Number(row.final_percent) : undefined,
        completedAt: row.completed_at ?? undefined,
      })),
    },
  };
}
