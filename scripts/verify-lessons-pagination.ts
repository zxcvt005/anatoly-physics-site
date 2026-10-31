/**
 * Lessons must load past the PostgREST 1000-row default.
 *
 * Run: npm run verify:lessons-pagination
 */
import assert from 'node:assert/strict';
import { fetchAllSupabaseRows } from '../src/lib/supabase/fetch-all-rows';
import { computeStudentAdminStats } from '../src/lib/student-admin-stats';
import {
  bootstrapIntegrationProcessEnv,
  createIntegrationSupabaseClient,
  resolveIntegrationSupabaseConfig,
} from './lib/supabase-integration-env';

function testSingleShortPage() {
  return fetchAllSupabaseRows(
    async () => ({
      data: [{ id: 'a' }, { id: 'b' }],
      error: null,
      count: 2,
    }),
    { idOf: (row) => row.id, pageSize: 1000 },
  ).then((result) => {
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(
        result.data.map((row) => row.id),
        ['a', 'b'],
      );
    }
  });
}

function testMultiplePagesPreserveOrderAndDedup() {
  const pages: Array<{ id: string }[]> = [
    Array.from({ length: 1000 }, (_, index) => ({ id: `n${index}` })),
    [{ id: 'n999' }, { id: 'n1000' }, { id: 'n1001' }],
  ];
  let calls = 0;

  return fetchAllSupabaseRows(
    async () => {
      const page = pages[calls] ?? [];
      calls += 1;
      return { data: page, error: null, count: 1002 };
    },
    { idOf: (row) => row.id, pageSize: 1000 },
  ).then((result) => {
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.length, 1002);
    assert.equal(result.data[0]?.id, 'n0');
    assert.equal(result.data[1001]?.id, 'n1001');
    assert.equal(new Set(result.data.map((row) => row.id)).size, 1002);
    assert.equal(calls, 2);
  });
}

async function testRetryWhenCountExceedsFirstPass() {
  let pass = 0;

  const result = await fetchAllSupabaseRows(
    async (from) => {
      if (pass === 0) {
        if (from === 0) {
          return {
            data: Array.from({ length: 1000 }, (_, index) => ({ id: `a${index}` })),
            error: null,
            count: 1028,
          };
        }
        pass = 1;
        return { data: [], error: null };
      }

      if (from === 0) {
        return {
          data: Array.from({ length: 1000 }, (_, index) => ({ id: `b${index}` })),
          error: null,
          count: 1028,
        };
      }

      return {
        data: Array.from({ length: 28 }, (_, index) => ({ id: `b${1000 + index}` })),
        error: null,
      };
    },
    { idOf: (row) => row.id, pageSize: 1000 },
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.length, 1028);
  assert.equal(result.data[0]?.id, 'b0');
  assert.equal(result.data[1027]?.id, 'b1027');
}

async function testPageError() {
  const result = await fetchAllSupabaseRows(
    async () => ({ data: null, error: { message: 'boom' } }),
    { idOf: (row: { id: string }) => row.id },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, 'boom');
  }
}

async function verifyAgainstSupabase() {
  bootstrapIntegrationProcessEnv();
  const config = resolveIntegrationSupabaseConfig(process.env);
  if (!config) {
    throw new Error('Missing Supabase integration config');
  }

  const { fetchLessonsFromSupabase } = await import(
    '../src/lib/supabase/lessons/repository'
  );
  const { fetchPaymentsFromSupabase } = await import(
    '../src/lib/supabase/payments/repository'
  );
  const { fetchStudentsFromSupabase } = await import(
    '../src/lib/supabase/students/repository'
  );

  const client = createIntegrationSupabaseClient(config);
  const { count, error: countError } = await client
    .from('lessons')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    throw new Error(`lessons count failed: ${countError.message}`);
  }

  const [lessonsResult, paymentsResult, studentsResult] = await Promise.all([
    fetchLessonsFromSupabase(),
    fetchPaymentsFromSupabase(),
    fetchStudentsFromSupabase(),
  ]);

  assert.equal(lessonsResult.ok, true, 'fetchLessonsFromSupabase failed');
  assert.equal(paymentsResult.ok, true, 'fetchPaymentsFromSupabase failed');
  assert.equal(studentsResult.ok, true, 'fetchStudentsFromSupabase failed');
  if (!lessonsResult.ok || !paymentsResult.ok || !studentsResult.ok) return;

  const lessons = lessonsResult.data;
  const lessonIds = lessons.map((lesson) => lesson.id);

  assert.equal(lessons.length, count);
  assert.equal(new Set(lessonIds).size, lessons.length);
  assert.ok(lessons.length >= 1028, `expected at least 1028 lessons, got ${lessons.length}`);

  const expectedBalances: Record<string, number> = {
    'Матвей Болдаков': -1,
    'Влада Ильичева': -1,
    'Лиза Лисовская': 7,
    'Маша Богдан': -8,
    'Родион Климко': -1,
    'Дарья Логунова': 0,
    'Дарья Критова': -5,
    'Маша Васильева': 4,
    'Петр Алатырев': 9,
    'Сергей Мисер': 21,
    'Тимур Широв': -8,
    'Филипп Зубарев': 1,
    'Юля Тарновская': -2,
  };

  const checked: string[] = [];
  for (const student of studentsResult.data) {
    const expected = expectedBalances[student.name];
    if (expected === undefined) continue;

    const stats = computeStudentAdminStats(
      student,
      lessons,
      paymentsResult.data,
    );

    assert.equal(
      stats.remainingLessons,
      expected,
      `${student.name}: remaining ${stats.remainingLessons}, expected ${expected}`,
    );
    checked.push(student.name);
  }

  assert.equal(
    checked.length,
    Object.keys(expectedBalances).length,
    `missing students: ${Object.keys(expectedBalances)
      .filter((name) => !checked.includes(name))
      .join(', ')}`,
  );

  console.log(
    `verify-lessons-pagination: loaded ${lessons.length} lessons, ${checked.length} balances match`,
  );
}

async function run() {
  await testSingleShortPage();
  await testMultiplePagesPreserveOrderAndDedup();
  await testRetryWhenCountExceedsFirstPass();
  await testPageError();
  await verifyAgainstSupabase();
  console.log('verify-lessons-pagination: all checks passed');
}

run();
