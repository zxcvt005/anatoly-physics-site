/**
 * Real Supabase integration for test editor CRUD.
 * Uses the same repository as production CRM API routes.
 *
 * Run: npm run verify:test-editor-supabase-integration
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  bootstrapIntegrationProcessEnv,
  createIntegrationSupabaseClient,
  resolveIntegrationSupabaseConfig,
} from './lib/supabase-integration-env';
import type { SaveTestInput } from '../src/types/tests';

async function checkSchema(client: SupabaseClient) {
  const tables = [
    'lesson_topic_sections',
    'lesson_topics',
    'tests',
    'test_questions',
    'test_question_options',
    'test_assignments',
    'test_attempts',
  ] as const;

  const report: Record<string, { exists: boolean; error?: string }> = {};

  for (const table of tables) {
    const { error } = await client.from(table).select('id').limit(1);
    report[table] = error
      ? { exists: false, error: `${error.code ?? 'ERR'}: ${error.message}` }
      : { exists: true };
  }

  return report;
}

function choiceQuestion(input: {
  id?: string;
  prompt: string;
  options: Array<{ id?: string; label: string; isCorrect: boolean }>;
}): SaveTestInput['questions'][number] {
  return {
    id: input.id,
    sortOrder: 0,
    questionType: 'single_choice',
    promptText: input.prompt,
    maxPoints: 1,
    config: {},
    options: input.options.map((option, index) => ({
      id: option.id,
      sortOrder: index,
      labelText: option.label,
      isCorrect: option.isCorrect,
    })),
  };
}

async function runRepositoryFlow() {
  const env = bootstrapIntegrationProcessEnv();
  const config = resolveIntegrationSupabaseConfig(env);
  if (!config) {
    throw new Error('Supabase URL or service role key missing');
  }

  console.log('[integration] Supabase key kind:', config.keyKind);

  const client = createIntegrationSupabaseClient(config);

  console.log('\n=== SCHEMA CHECK ===');
  const schema = await checkSchema(client);
  for (const [table, info] of Object.entries(schema)) {
    console.log(
      `${table}: ${info.exists ? 'OK' : 'MISSING'}${info.error ? ` (${info.error})` : ''}`,
    );
  }

  const missing = Object.entries(schema).filter(([, info]) => !info.exists);
  if (missing.length > 0) {
    console.error('\nAborting: required tables missing or inaccessible.');
    process.exit(1);
  }

  const {
    insertLessonTopicSectionToSupabase,
    insertLessonTopicToSupabase,
    saveHomeworkTestForTopicInSupabase,
    fetchHomeworkTestByTopicFromSupabase,
    deleteHomeworkTestForTopicInSupabase,
  } = await import('../src/lib/supabase/tests/repository');

  const stamp = Date.now();
  const sectionTitle = `E2E section ${stamp}`;
  const topicTitle = `E2E topic ${stamp}`;

  console.log('\n=== CREATE SECTION ===');
  const sectionResult = await insertLessonTopicSectionToSupabase(sectionTitle);
  console.log('create section:', sectionResult.ok ? 'OK' : sectionResult.error);
  if (!sectionResult.ok) process.exit(1);

  console.log('\n=== CREATE TOPIC ===');
  const topicResult = await insertLessonTopicToSupabase(
    topicTitle,
    sectionResult.data.id,
  );
  console.log('create topic:', topicResult.ok ? 'OK' : topicResult.error);
  if (!topicResult.ok) {
    await cleanupTopic(client, null);
    process.exit(1);
  }

  const topicAppId = topicResult.data.id;
  console.log('topicAppId:', topicAppId);
  if (topicResult.data.sectionId !== sectionResult.data.id) {
    console.error('topic was not attached to the new section');
    await cleanupTopic(client, topicAppId);
    process.exit(1);
  }

  console.log('\n=== SAVE TEST ===');
  const firstPayload: SaveTestInput = {
    title: topicTitle,
    isPublished: true,
    questions: [
      choiceQuestion({
        prompt: 'Сколько будет 2+2?',
        options: [
          { label: '3', isCorrect: false },
          { label: '4', isCorrect: true },
          { label: '5', isCorrect: false },
        ],
      }),
    ],
  };

  const saveResult = await saveHomeworkTestForTopicInSupabase(
    topicAppId,
    firstPayload,
  );
  console.log('save:', saveResult.ok ? 'OK' : saveResult.error);
  if (!saveResult.ok) {
    await cleanupTopic(client, topicAppId);
    process.exit(1);
  }

  console.log('\n=== RELOAD TEST ===');
  const reload = await fetchHomeworkTestByTopicFromSupabase(topicAppId);
  console.log('reload:', reload.ok ? 'OK' : reload.error);
  if (!reload.ok || !reload.data) {
    await cleanupTopic(client, topicAppId);
    process.exit(1);
  }

  const firstQuestion = reload.data.questions[0];
  if (!firstQuestion) {
    console.error('reloaded test has no questions');
    await cleanupTopic(client, topicAppId);
    process.exit(1);
  }

  console.log('\n=== EDIT QUESTION / OPTIONS / CORRECT ANSWER ===');
  const editedPayload: SaveTestInput = {
    title: `${topicTitle} updated`,
    isPublished: true,
    questions: [
      choiceQuestion({
        id: firstQuestion.id,
        prompt: 'Сколько будет 3+3?',
        options: firstQuestion.options.map((option, index) => ({
          id: option.id,
          label: index === 0 ? '6' : index === 1 ? '7' : '8',
          isCorrect: index === 0,
        })),
      }),
    ],
  };

  const editResult = await saveHomeworkTestForTopicInSupabase(
    topicAppId,
    editedPayload,
  );
  console.log('edit save:', editResult.ok ? 'OK' : editResult.error);
  if (!editResult.ok) {
    await cleanupTopic(client, topicAppId);
    process.exit(1);
  }

  const reloadedAfterEdit = await fetchHomeworkTestByTopicFromSupabase(topicAppId);
  if (!reloadedAfterEdit.ok || !reloadedAfterEdit.data) {
    console.error('reload after edit failed:', reloadedAfterEdit.ok ? 'empty' : reloadedAfterEdit.error);
    await cleanupTopic(client, topicAppId);
    process.exit(1);
  }

  const editedQuestion = reloadedAfterEdit.data.questions[0];
  const correctLabels = (editedQuestion?.options ?? [])
    .filter((option) => option.isCorrect)
    .map((option) => option.labelText);

  console.log('edited prompt:', editedQuestion?.promptText);
  console.log('correct labels:', correctLabels.join(', '));

  const editOk =
    reloadedAfterEdit.data.test.title === `${topicTitle} updated` &&
    editedQuestion?.promptText === 'Сколько будет 3+3?' &&
    correctLabels.length === 1 &&
    correctLabels[0] === '6';

  console.log('\n=== DELETE TEST ===');
  const deleteResult = await deleteHomeworkTestForTopicInSupabase(topicAppId);
  console.log('delete:', deleteResult.ok ? 'OK' : deleteResult.error);

  const testAfterDelete = await resolveTestUuid(client, topicAppId);
  console.log('test row after delete:', testAfterDelete ?? 'GONE');

  console.log('\n=== ARCHIVE TOPIC (cleanup) ===');
  await cleanupTopic(client, topicAppId);
  await client
    .from('lesson_topic_sections')
    .update({ is_active: false })
    .eq('app_id', sectionResult.data.id);

  const passed =
    editOk &&
    deleteResult.ok &&
    testAfterDelete === null;

  if (passed) {
    console.log('\nverify-test-editor-supabase-integration: PASSED');
  } else {
    console.error('\nverify-test-editor-supabase-integration: FAILED');
    process.exit(1);
  }
}

async function resolveTestUuid(
  client: SupabaseClient,
  topicAppId: string,
): Promise<string | null> {
  const { data: topic } = await client
    .from('lesson_topics')
    .select('id')
    .eq('app_id', topicAppId)
    .maybeSingle();
  if (!topic) return null;

  const { data: test } = await client
    .from('tests')
    .select('id')
    .eq('lesson_topic_id', topic.id)
    .eq('is_active', true)
    .maybeSingle();

  return test?.id ?? null;
}

async function cleanupTopic(client: SupabaseClient, topicAppId: string | null) {
  if (!topicAppId) return;
  const testUuid = await resolveTestUuid(client, topicAppId);
  if (testUuid) {
    await client.from('test_questions').delete().eq('test_id', testUuid);
    await client.from('tests').delete().eq('id', testUuid);
  }
  await client.from('lesson_topics').update({ is_active: false }).eq('app_id', topicAppId);
}

void runRepositoryFlow().catch((error) => {
  console.error('[integration] fatal:', error);
  process.exit(1);
});
