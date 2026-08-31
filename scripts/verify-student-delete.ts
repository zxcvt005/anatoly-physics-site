/**
 * Verifies hard delete of a student and all related rows.
 * Creates two students (target + control), seeds related data, deletes target,
 * asserts target data is gone and control data remains.
 *
 * Run: npm run verify:student-delete
 */
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  STUDENT_HARD_DELETE_CASCADE_STEPS,
  STUDENT_HARD_DELETE_EXPLICIT_STEPS,
  STUDENT_HARD_DELETE_SET_NULL_STEPS,
} from '../src/lib/supabase/students/delete-student-policy';
import { hardDeleteStudentByAppId } from '../src/lib/supabase/students/delete-student-cascade';
import { formatStudentDeleteError } from '../src/lib/student-utils';
import {
  assertIntegrationSupabaseReachable,
  bootstrapIntegrationProcessEnv,
  createIntegrationSupabaseClient,
  formatSupabaseOperationError,
  resolveIntegrationSupabaseConfig,
  throwIfSupabaseError,
  type IntegrationSupabaseConfig,
} from './lib/supabase-integration-env';

interface FixtureStudent {
  appId: string;
  token: string;
  uuid: string;
  lessonUuid: string;
  lessonAppId: string;
  paymentAppId: string;
  scheduleSlotAppId: string;
  trialAppId: string;
  assignmentAppId: string;
  attemptAppId: string;
  attemptUuid: string;
}

const RUN_ID = Date.now();

function studentAppId(label: 'target' | 'control') {
  return `verify-delete-${label}-${RUN_ID}`;
}

async function countForStudent(
  client: SupabaseClient,
  table:
    | 'payments'
    | 'lessons'
    | 'schedule_slot_students'
    | 'student_intensive_progress'
    | 'legal_consents'
    | 'test_assignments'
    | 'test_attempts'
    | 'students',
  studentUuid: string,
): Promise<number> {
  const column = table === 'students' ? 'id' : 'student_id';
  const { count, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, studentUuid);

  if (error) {
    throw new Error(`count ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function countAttemptAnswers(
  client: SupabaseClient,
  attemptUuid: string,
): Promise<number> {
  const { count, error } = await client
    .from('test_attempt_answers')
    .select('*', { count: 'exact', head: true })
    .eq('attempt_id', attemptUuid);

  if (error) {
    throw new Error(`count test_attempt_answers: ${error.message}`);
  }

  return count ?? 0;
}

async function countScheduleLinksForSlot(
  client: SupabaseClient,
  slotUuid: string,
  studentUuid: string,
): Promise<number> {
  const { count, error } = await client
    .from('schedule_slot_students')
    .select('*', { count: 'exact', head: true })
    .eq('schedule_slot_id', slotUuid)
    .eq('student_id', studentUuid);

  if (error) {
    throw new Error(`count schedule_slot_students: ${error.message}`);
  }

  return count ?? 0;
}

async function seedStudentFixture(
  client: SupabaseClient,
  config: IntegrationSupabaseConfig,
  label: 'target' | 'control',
  shared: {
    intensiveUuid: string;
    testUuid: string;
    scheduleSlotUuid: string;
  },
): Promise<FixtureStudent> {
  const appId = studentAppId(label);
  const token = `${label}-token-${RUN_ID}`;

  const { data: studentRow, error: studentError } = await client
    .from('students')
    .insert({
      app_id: appId,
      first_name: label === 'target' ? 'Delete' : 'Keep',
      last_name: label === 'target' ? 'Me' : 'Me',
      name: label === 'target' ? 'Delete Me' : 'Keep Me',
      grade_class: '11',
      access_token: token,
      rate_4_weeks: 16000,
      lessons_per_week: 2,
      activity_status: 'active',
    })
    .select('id')
    .single();

  if (studentError) {
    throw new Error(
      formatSupabaseOperationError(`insert student (${label})`, studentError, config),
    );
  }

  const studentUuid = studentRow.id as string;
  const lessonAppId = `verify-lesson-${label}-${RUN_ID}`;
  const paymentAppId = `verify-payment-${label}-${RUN_ID}`;

  const { data: lessonRow, error: lessonError } = await client
    .from('lessons')
    .insert({
      app_id: lessonAppId,
      student_id: studentUuid,
      lesson_at: new Date().toISOString(),
      status: 'completed',
      payment_status: 'paid',
      lesson_type: 'regular',
    })
    .select('id')
    .single();

  if (lessonError) {
    throw new Error(
      formatSupabaseOperationError(`insert lesson (${label})`, lessonError, config),
    );
  }

  const lessonUuid = lessonRow.id as string;

  const { error: paymentError } = await client.from('payments').insert({
    app_id: paymentAppId,
    student_id: studentUuid,
    amount: 4000,
    status: 'confirmed',
  });

  if (paymentError) {
    throw new Error(
      formatSupabaseOperationError(`insert payment (${label})`, paymentError, config),
    );
  }

  const { error: scheduleLinkError } = await client
    .from('schedule_slot_students')
    .insert({
      schedule_slot_id: shared.scheduleSlotUuid,
      student_id: studentUuid,
    });

  if (scheduleLinkError) {
    throw new Error(
      formatSupabaseOperationError(
        `insert schedule link (${label})`,
        scheduleLinkError,
        config,
      ),
    );
  }

  const { error: progressError } = await client
    .from('student_intensive_progress')
    .insert({
      student_id: studentUuid,
      intensive_id: shared.intensiveUuid,
      status: 'not_started',
    });

  if (progressError) {
    throw new Error(
      formatSupabaseOperationError(
        `insert intensive progress (${label})`,
        progressError,
        config,
      ),
    );
  }

  const { error: consentError } = await client.from('legal_consents').insert({
    student_id: studentUuid,
    consent_type: 'privacy',
    document_version: `verify-${RUN_ID}`,
    source: 'form',
  });

  if (consentError) {
    throw new Error(
      formatSupabaseOperationError(
        `insert legal consent (${label})`,
        consentError,
        config,
      ),
    );
  }

  const assignmentAppId = `verify-assignment-${label}-${RUN_ID}`;
  const { data: assignmentRow, error: assignmentError } = await client
    .from('test_assignments')
    .insert({
      app_id: assignmentAppId,
      test_id: shared.testUuid,
      student_id: studentUuid,
      lesson_id: lessonUuid,
      status: 'assigned',
      source: 'lesson',
    })
    .select('id')
    .single();

  if (assignmentError) {
    throw new Error(
      formatSupabaseOperationError(
        `insert test assignment (${label})`,
        assignmentError,
        config,
      ),
    );
  }

  const attemptAppId = `verify-attempt-${label}-${RUN_ID}`;
  const { data: attemptRow, error: attemptError } = await client
    .from('test_attempts')
    .insert({
      app_id: attemptAppId,
      test_id: shared.testUuid,
      test_version: 1,
      student_id: studentUuid,
      assignment_id: assignmentRow.id,
      stage: 'draft_1',
      question_snapshot: [],
    })
    .select('id')
    .single();

  if (attemptError) {
    throw new Error(
      formatSupabaseOperationError(
        `insert test attempt (${label})`,
        attemptError,
        config,
      ),
    );
  }

  const attemptUuid = attemptRow.id as string;

  const { error: answerError } = await client.from('test_attempt_answers').insert({
    attempt_id: attemptRow.id,
    question_id: '00000000-0000-0000-0000-000000000001',
    attempt_number: 1,
    answer: { value: 1 },
    is_correct: true,
  });

  if (answerError) {
    throw new Error(
      formatSupabaseOperationError(
        `insert test answer (${label})`,
        answerError,
        config,
      ),
    );
  }

  const trialAppId = `verify-trial-${label}-${RUN_ID}`;
  const { error: trialError } = await client.from('trial_lessons').insert({
    app_id: trialAppId,
    first_name: label,
    last_name: 'Trial',
    trial_date: '2026-09-01',
    grade_class: '11',
    goal: 'ЕГЭ',
    current_result: '60',
    proposed_rate_4_weeks: 16000,
    proposed_lessons_per_week: 2,
    parent_name: 'Parent',
    parent_phone: '+79990000000',
    linked_student_id: studentUuid,
  });

  if (trialError) {
    throw new Error(
      formatSupabaseOperationError(
        `insert trial lesson (${label})`,
        trialError,
        config,
      ),
    );
  }

  return {
    appId,
    token,
    uuid: studentUuid,
    lessonUuid,
    lessonAppId,
    paymentAppId,
    scheduleSlotAppId: `verify-slot-${RUN_ID}`,
    trialAppId,
    assignmentAppId,
    attemptAppId,
    attemptUuid,
  };
}

async function assertStudentHasFullFixture(
  client: SupabaseClient,
  fixture: FixtureStudent,
  scheduleSlotUuid: string,
) {
  assert.equal(await countForStudent(client, 'students', fixture.uuid), 1);
  assert.equal(await countForStudent(client, 'payments', fixture.uuid), 1);
  assert.equal(await countForStudent(client, 'lessons', fixture.uuid), 1);
  assert.equal(
    await countScheduleLinksForSlot(client, scheduleSlotUuid, fixture.uuid),
    1,
  );
  assert.equal(
    await countForStudent(client, 'student_intensive_progress', fixture.uuid),
    1,
  );
  assert.equal(await countForStudent(client, 'legal_consents', fixture.uuid), 1);
  assert.equal(await countForStudent(client, 'test_assignments', fixture.uuid), 1);
  assert.equal(await countForStudent(client, 'test_attempts', fixture.uuid), 1);

  const { data: attemptRow } = await client
    .from('test_attempts')
    .select('id')
    .eq('app_id', fixture.attemptAppId)
    .maybeSingle();

  assert.ok(attemptRow?.id);
  assert.equal(await countAttemptAnswers(client, fixture.attemptUuid), 1);

  const { data: trialRow } = await client
    .from('trial_lessons')
    .select('linked_student_id')
    .eq('app_id', fixture.trialAppId)
    .maybeSingle();

  assert.equal(trialRow?.linked_student_id, fixture.uuid);
}

async function assertStudentFullyRemoved(
  client: SupabaseClient,
  fixture: FixtureStudent,
  scheduleSlotUuid: string,
) {
  assert.equal(await countForStudent(client, 'students', fixture.uuid), 0);
  assert.equal(await countForStudent(client, 'payments', fixture.uuid), 0);
  assert.equal(await countForStudent(client, 'lessons', fixture.uuid), 0);
  assert.equal(
    await countScheduleLinksForSlot(client, scheduleSlotUuid, fixture.uuid),
    0,
  );
  assert.equal(
    await countForStudent(client, 'student_intensive_progress', fixture.uuid),
    0,
  );
  assert.equal(await countForStudent(client, 'legal_consents', fixture.uuid), 0);
  assert.equal(await countForStudent(client, 'test_assignments', fixture.uuid), 0);
  assert.equal(await countForStudent(client, 'test_attempts', fixture.uuid), 0);

  assert.equal(await countAttemptAnswers(client, fixture.attemptUuid), 0);

  const { data: trialRow } = await client
    .from('trial_lessons')
    .select('linked_student_id')
    .eq('app_id', fixture.trialAppId)
    .maybeSingle();

  assert.ok(trialRow);
  assert.equal(trialRow.linked_student_id, null);
}

async function cleanupSharedFixture(
  client: SupabaseClient,
  shared: {
    topicAppId: string;
    testAppId: string;
    intensiveAppId: string;
    scheduleSlotAppId: string;
  },
) {
  await client.from('tests').delete().eq('app_id', shared.testAppId);
  await client.from('lesson_topics').delete().eq('app_id', shared.topicAppId);
  await client.from('intensives').delete().eq('app_id', shared.intensiveAppId);
  await client.from('schedule_slots').delete().eq('app_id', shared.scheduleSlotAppId);
}

function runPolicyUnitChecks() {
  assert.deepEqual(STUDENT_HARD_DELETE_EXPLICIT_STEPS, ['payments', 'lessons']);
  assert.ok(STUDENT_HARD_DELETE_CASCADE_STEPS.includes('test_attempt_answers'));
  assert.ok(STUDENT_HARD_DELETE_SET_NULL_STEPS.includes('trial_lessons'));
  assert.equal(
    formatStudentDeleteError('  custom error  '),
    'custom error',
  );
  assert.equal(formatStudentDeleteError(''), 'Не удалось удалить ученика');
  assert.equal(
    formatStudentDeleteError('violates foreign key constraint'),
    'violates foreign key constraint',
  );
}

async function runIntegrationFlow() {
  bootstrapIntegrationProcessEnv();
  const config = resolveIntegrationSupabaseConfig(process.env);

  if (!config) {
    console.warn(
      '[verify:student-delete] integration skipped: set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY in .env.local',
    );
    return;
  }

  console.log(
    `[verify:student-delete] integration config: projectUrl=${config.url} keyEnv=${config.keyKind}`,
  );

  const client = createIntegrationSupabaseClient(config);
  await assertIntegrationSupabaseReachable(client, config);

  const shared = {
    topicAppId: `verify-topic-${RUN_ID}`,
    testAppId: `verify-test-${RUN_ID}`,
    intensiveAppId: `verify-intensive-${RUN_ID}`,
    scheduleSlotAppId: `verify-slot-${RUN_ID}`,
    intensiveUuid: '',
    testUuid: '',
    scheduleSlotUuid: '',
  };

  const { data: intensiveRow, error: intensiveError } = await client
    .from('intensives')
    .insert({
      app_id: shared.intensiveAppId,
      title: shared.intensiveAppId,
    })
    .select('id')
    .single();

  throwIfSupabaseError('insert intensive', intensiveError, config);

  shared.intensiveUuid = intensiveRow!.id as string;

  const { data: topicRow, error: topicError } = await client
    .from('lesson_topics')
    .insert({
      app_id: shared.topicAppId,
      title: `Verify topic ${RUN_ID}`,
    })
    .select('id')
    .single();

  throwIfSupabaseError('insert lesson topic', topicError, config);

  const { data: testRow, error: testError } = await client
    .from('tests')
    .insert({
      app_id: shared.testAppId,
      test_type: 'homework',
      title: `Verify test ${RUN_ID}`,
      lesson_topic_id: topicRow!.id,
      is_published: true,
    })
    .select('id')
    .single();

  throwIfSupabaseError('insert test', testError, config);

  shared.testUuid = testRow!.id as string;

  const { data: slotRow, error: slotError } = await client
    .from('schedule_slots')
    .insert({
      app_id: shared.scheduleSlotAppId,
      weekday: 1,
      start_time: '10:00:00',
      end_time: '11:30:00',
    })
    .select('id')
    .single();

  throwIfSupabaseError('insert schedule slot', slotError, config);

  shared.scheduleSlotUuid = slotRow!.id as string;

  const target = await seedStudentFixture(client, config, 'target', shared);
  const control = await seedStudentFixture(client, config, 'control', shared);

  await assertStudentHasFullFixture(client, target, shared.scheduleSlotUuid);
  await assertStudentHasFullFixture(client, control, shared.scheduleSlotUuid);

  const deleteResult = await hardDeleteStudentByAppId(client, target.appId);
  assert.equal(deleteResult.ok, true, deleteResult.ok ? '' : deleteResult.error);

  await assertStudentFullyRemoved(client, target, shared.scheduleSlotUuid);
  await assertStudentHasFullFixture(client, control, shared.scheduleSlotUuid);

  const controlDeleteResult = await hardDeleteStudentByAppId(client, control.appId);
  assert.equal(
    controlDeleteResult.ok,
    true,
    controlDeleteResult.ok ? '' : controlDeleteResult.error,
  );

  await cleanupSharedFixture(client, shared);

  console.log('[verify:student-delete] integration OK');
}

async function main() {
  runPolicyUnitChecks();
  console.log('[verify:student-delete] policy unit checks OK');

  await runIntegrationFlow();
  console.log('[verify:student-delete] all checks passed');
}

main().catch((error) => {
  console.error('[verify:student-delete] FAILED:', error);
  process.exit(1);
});
