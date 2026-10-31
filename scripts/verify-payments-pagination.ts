/**
 * Payments must load past the PostgREST 1000-row default.
 *
 * Run: npm run verify:payments-pagination
 */
import assert from 'node:assert/strict';
import { computeStudentAdminStats } from '../src/lib/student-admin-stats';
import { fetchAllSupabaseRows } from '../src/lib/supabase/fetch-all-rows';
import { computeRatePerLesson } from '../src/lib/student-utils';
import {
  bootstrapIntegrationProcessEnv,
  createIntegrationSupabaseClient,
  resolveIntegrationSupabaseConfig,
} from './lib/supabase-integration-env';

const EXPECTED_BALANCES: Record<string, number> = {
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

async function verifyAgainstSupabase() {
  bootstrapIntegrationProcessEnv();
  const config = resolveIntegrationSupabaseConfig(process.env);
  if (!config) {
    throw new Error('Missing Supabase integration config');
  }

  const { fetchPaymentsFromSupabase } = await import(
    '../src/lib/supabase/payments/repository'
  );
  const { fetchLessonsFromSupabase } = await import(
    '../src/lib/supabase/lessons/repository'
  );
  const { fetchStudentsFromSupabase } = await import(
    '../src/lib/supabase/students/repository'
  );

  const client = createIntegrationSupabaseClient(config);

  const { count: paymentCount, error: paymentCountError } = await client
    .from('payments')
    .select('id', { count: 'exact', head: true });
  if (paymentCountError) {
    throw new Error(`payments count failed: ${paymentCountError.message}`);
  }

  const rawPaymentsResult = await fetchAllSupabaseRows(
    async (from, to) =>
      client
        .from('payments')
        .select('id, app_id, student_id, amount, status', {
          count: from === 0 ? 'exact' : undefined,
        })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to),
    { idOf: (row: { id: string }) => row.id },
  );
  if (!rawPaymentsResult.ok) {
    throw new Error(`raw payments pagination failed: ${rawPaymentsResult.error}`);
  }

  const rawLessonsResult = await fetchAllSupabaseRows(
    async (from, to) =>
      client
        .from('lessons')
        .select('id, student_id, status, is_chargeable', {
          count: from === 0 ? 'exact' : undefined,
        })
        .order('lesson_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to),
    { idOf: (row: { id: string }) => row.id },
  );
  assert.equal(rawLessonsResult.ok, true, 'raw lessons pagination failed');
  if (!rawLessonsResult.ok) return;

  const [paymentsResult, lessonsResult, studentsResult] = await Promise.all([
    fetchPaymentsFromSupabase(),
    fetchLessonsFromSupabase(),
    fetchStudentsFromSupabase(),
  ]);

  assert.equal(paymentsResult.ok, true, 'fetchPaymentsFromSupabase failed');
  assert.equal(lessonsResult.ok, true, 'fetchLessonsFromSupabase failed');
  assert.equal(studentsResult.ok, true, 'fetchStudentsFromSupabase failed');
  if (!paymentsResult.ok || !lessonsResult.ok || !studentsResult.ok) return;

  const payments = paymentsResult.data;
  const paymentIds = payments.map((payment) => payment.id);

  assert.equal(payments.length, paymentCount);
  assert.equal(new Set(paymentIds).size, payments.length);
  assert.equal(payments.length, rawPaymentsResult.data.length);
  assert.ok(
    payments.length >= 180,
    `expected at least 180 payments, got ${payments.length}`,
  );

  const statuses = new Set(payments.map((payment) => payment.status));
  const rawStatusCounts = new Map<string, number>();
  for (const row of rawPaymentsResult.data) {
    rawStatusCounts.set(row.status, (rawStatusCounts.get(row.status) ?? 0) + 1);
  }
  for (const status of rawStatusCounts.keys()) {
    assert.equal(
      payments.filter((payment) => payment.status === status).length,
      rawStatusCounts.get(status),
      `status ${status} count mismatch`,
    );
  }
  assert.ok(statuses.has('confirmed'), 'confirmed payments missing');

  const studentsByUuid = new Map<
    string,
    { appId: string; name: string; ratePerLesson: number }
  >();
  const { data: studentRows, error: studentRowsError } = await client
    .from('students')
    .select('id, app_id, name, rate_4_weeks, lessons_per_week');
  if (studentRowsError) {
    throw new Error(studentRowsError.message);
  }
  for (const row of studentRows ?? []) {
    studentsByUuid.set(row.id, {
      appId: row.app_id,
      name: row.name,
      ratePerLesson: computeRatePerLesson(row.rate_4_weeks, row.lessons_per_week),
    });
  }

  const confirmedTotalByAppId = new Map<string, number>();
  for (const row of rawPaymentsResult.data) {
    if (row.status !== 'confirmed') continue;
    const student = studentsByUuid.get(row.student_id);
    if (!student) continue;
    confirmedTotalByAppId.set(
      student.appId,
      (confirmedTotalByAppId.get(student.appId) ?? 0) + Number(row.amount),
    );
  }

  const chargeableByAppId = new Map<string, number>();
  for (const row of rawLessonsResult.data) {
    if (row.status !== 'completed' || row.is_chargeable !== true) continue;
    const student = studentsByUuid.get(row.student_id);
    if (!student) continue;
    chargeableByAppId.set(
      student.appId,
      (chargeableByAppId.get(student.appId) ?? 0) + 1,
    );
  }

  const loadedConfirmedByStudent = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== 'confirmed') continue;
    loadedConfirmedByStudent.set(
      payment.studentId,
      (loadedConfirmedByStudent.get(payment.studentId) ?? 0) + payment.amount,
    );
  }

  for (const [appId, total] of confirmedTotalByAppId) {
    assert.equal(
      loadedConfirmedByStudent.get(appId) ?? 0,
      total,
      `confirmed total mismatch for ${appId}`,
    );
  }

  const checked: string[] = [];
  for (const student of studentsResult.data) {
    const expected = EXPECTED_BALANCES[student.name];
    if (expected === undefined) continue;

    const stats = computeStudentAdminStats(
      student,
      lessonsResult.data,
      payments,
    );

    const rate = student.ratePerLesson;
    const confirmedTotal = confirmedTotalByAppId.get(student.id) ?? 0;
    const paidSlots = rate > 0 ? Math.floor(confirmedTotal / rate) : 0;
    const sqlBalance = paidSlots - (chargeableByAppId.get(student.id) ?? 0);

    assert.equal(
      stats.remainingLessons,
      sqlBalance,
      `${student.name}: UI ${stats.remainingLessons} != SQL ${sqlBalance}`,
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
    Object.keys(EXPECTED_BALANCES).length,
    `missing students: ${Object.keys(EXPECTED_BALANCES)
      .filter((name) => !checked.includes(name))
      .join(', ')}`,
  );

  console.log(
    `verify-payments-pagination: loaded ${payments.length} payments ` +
      `(${[...rawStatusCounts.entries()]
        .map(([status, count]) => `${status}=${count}`)
        .join(', ')}), ${checked.length} balances match SQL`,
  );
}

async function run() {
  await verifyAgainstSupabase();
  console.log('verify-payments-pagination: all checks passed');
}

run();
