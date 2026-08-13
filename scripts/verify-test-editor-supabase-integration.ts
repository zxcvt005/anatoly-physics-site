/**
 * Real Supabase integration for test editor save/delete.
 * Uses the same repository as production CRM API routes.
 *
 * Run: npx tsx scripts/verify-test-editor-supabase-integration.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function loadEnvLocal(): Record<string, string> {
  const candidates = ['.env.local', '.env.vercel.production', '.env.vercel.local'];
  const env: Record<string, string> = {};

  for (const fileName of candidates) {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;

    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (value && value !== '[SENSITIVE]') {
        env[key] = value;
      }
    }
  }

  if (Object.keys(env).length === 0) {
    throw new Error('Missing usable env (.env.local or .env.vercel.production)');
  }

  return env;
}

function getSupabaseConfig(env: Record<string, string>) {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_SECRET_KEY ??
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase URL or key missing in .env.local');
  }

  return {
    url,
    serviceKey,
    keyKind: env.SUPABASE_SERVICE_ROLE_KEY
      ? 'service_role'
      : env.SUPABASE_SECRET_KEY
        ? 'secret'
        : 'publishable_fallback',
  };
}

async function checkSchema(client: SupabaseClient) {
  const tables = [
    'lesson_topics',
    'tests',
    'test_questions',
    'test_question_options',
    'test_assignments',
    'test_attempts',
  ] as const;

  const report: Record<string, { exists: boolean; error?: string; sample?: unknown }> =
    {};

  for (const table of tables) {
    const { data, error } = await client.from(table).select('*').limit(1);
    report[table] = error
      ? { exists: false, error: `${error.code ?? 'ERR'}: ${error.message}` }
      : { exists: true, sample: data?.[0] ?? null };
  }

  return report;
}

async function runRepositoryFlow() {
  process.chdir(path.join(process.cwd()));

  const env = loadEnvLocal();
  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) process.env[key] = value;
  }

  const config = getSupabaseConfig(env);
  console.log('[integration] Supabase key kind:', config.keyKind);

  const client = createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
    insertLessonTopicToSupabase,
    saveHomeworkTestForTopicInSupabase,
    fetchHomeworkTestByTopicFromSupabase,
    deleteHomeworkTestForTopicInSupabase,
  } = await import('../src/lib/supabase/tests/repository');

  const topicTitle = `E2E integration ${Date.now()}`;
  console.log('\n=== CREATE TOPIC ===');
  const topicResult = await insertLessonTopicToSupabase(topicTitle, null);
  console.log('create topic:', topicResult.ok ? 'OK' : topicResult.error);
  if (!topicResult.ok) process.exit(1);

  const topicAppId = topicResult.data.id;
  console.log('topicAppId:', topicAppId);

  console.log('\n=== SAVE TEST WITH 3 QUESTIONS ===');
  const savePayload = {
    title: topicTitle,
    isPublished: true,
    questions: [1, 2, 3].map((n, index) => ({
      sortOrder: index,
      questionType: 'numeric' as const,
      promptText: `Условие ${n}`,
      maxPoints: 1,
      config: { correctValue: n, tolerance: 0 },
      options: [],
    })),
  };

  const saveResult = await saveHomeworkTestForTopicInSupabase(topicAppId, savePayload);
  console.log('save:', saveResult.ok ? 'OK' : saveResult.error);
  if (!saveResult.ok) {
    await cleanupTopic(client, topicAppId);
    process.exit(1);
  }

  console.log('testAppId:', saveResult.data.test.id);
  console.log('version:', saveResult.data.test.version);
  console.log('questions returned:', saveResult.data.questions.length);

  const testUuid = await resolveTestUuid(client, topicAppId);
  const dbQuestions = await countQuestions(client, testUuid);
  console.log('test_questions rows in DB:', dbQuestions);

  console.log('\n=== RELOAD TEST ===');
  const reload = await fetchHomeworkTestByTopicFromSupabase(topicAppId);
  console.log('reload:', reload.ok ? 'OK' : reload.error);
  if (!reload.ok || !reload.data) {
    await cleanupTopic(client, topicAppId);
    process.exit(1);
  }
  console.log('reloaded questions:', reload.data.questions.length);

  console.log('\n=== DELETE TEST ===');
  const deleteResult = await deleteHomeworkTestForTopicInSupabase(topicAppId);
  console.log('delete:', deleteResult.ok ? 'OK' : deleteResult.error);
  if (!deleteResult.ok) {
    console.log('delete code:', (deleteResult as { code?: string }).code);
  }

  const testAfterDelete = await resolveTestUuid(client, topicAppId);
  console.log('test row after delete:', testAfterDelete ?? 'GONE');

  console.log('\n=== ARCHIVE TOPIC (cleanup) ===');
  await cleanupTopic(client, topicAppId);

  const passed =
    saveResult.data.questions.length === 3 &&
    dbQuestions === 3 &&
    reload.data.questions.length === 3 &&
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

async function countQuestions(client: SupabaseClient, testUuid: string | null): Promise<number> {
  if (!testUuid) return 0;
  const { count } = await client
    .from('test_questions')
    .select('id', { count: 'exact', head: true })
    .eq('test_id', testUuid);
  return count ?? 0;
}

async function cleanupTopic(client: SupabaseClient, topicAppId: string) {
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
