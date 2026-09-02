/**
 * Verifies test assignment dismiss behavior and assignment-only homework display rules.
 *
 * Run: npm run verify:test-assignment-dismiss
 */
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getActiveHomeworkItems,
  getCurrentLessonHomework,
} from '../src/lib/tests/student-homework-stats';
import type { StudentHomeworkListItem } from '../src/types/tests';
import {
  assertIntegrationSupabaseReachable,
  bootstrapIntegrationProcessEnv,
  createIntegrationSupabaseClient,
  formatSupabaseOperationError,
  resolveIntegrationSupabaseConfig,
  type IntegrationSupabaseConfig,
} from './lib/supabase-integration-env';

const RUN_ID = Date.now();

interface FixtureContext {
  config: IntegrationSupabaseConfig;
  client: SupabaseClient;
  studentAppId: string;
  studentUuid: string;
  otherStudentAppId: string;
  otherStudentUuid: string;
  topicAppId: string;
  topicUuid: string;
  testUuid: string;
  testAppId: string;
  oldAssignmentAppId: string;
  newAssignmentAppId: string;
  otherAssignmentAppId: string;
}

async function seedFixture(
  client: SupabaseClient,
  config: IntegrationSupabaseConfig,
): Promise<FixtureContext> {
  const studentAppId = `verify-dismiss-student-${RUN_ID}`;
  const otherStudentAppId = `verify-dismiss-other-${RUN_ID}`;
  const topicAppId = `verify-dismiss-topic-${RUN_ID}`;
  const testAppId = `verify-dismiss-test-${RUN_ID}`;
  const oldAssignmentAppId = `verify-dismiss-asg-old-${RUN_ID}`;
  const newAssignmentAppId = `verify-dismiss-asg-new-${RUN_ID}`;
  const otherAssignmentAppId = `verify-dismiss-asg-other-${RUN_ID}`;

  const { data: studentRow, error: studentError } = await client
    .from('students')
    .insert({
      app_id: studentAppId,
      first_name: 'Dismiss',
      last_name: 'Student',
      name: 'Dismiss Student',
      grade_class: '11',
      access_token: `dismiss-token-${RUN_ID}`,
      rate_4_weeks: 16000,
      lessons_per_week: 2,
      activity_status: 'active',
    })
    .select('id')
    .single();

  if (studentError) {
    throw new Error(formatSupabaseOperationError('insert student', studentError, config));
  }

  if (!studentRow) {
    throw new Error('insert student returned no row');
  }

  const studentUuid = studentRow.id as string;

  const { data: otherStudentRow, error: otherStudentError } = await client
    .from('students')
    .insert({
      app_id: otherStudentAppId,
      first_name: 'Other',
      last_name: 'Student',
      name: 'Other Student',
      grade_class: '11',
      access_token: `dismiss-other-${RUN_ID}`,
      rate_4_weeks: 16000,
      lessons_per_week: 2,
      activity_status: 'active',
    })
    .select('id')
    .single();

  if (otherStudentError) {
    throw new Error(
      formatSupabaseOperationError('insert other student', otherStudentError, config),
    );
  }

  if (!otherStudentRow) {
    throw new Error('insert other student returned no row');
  }

  const otherStudentUuid = otherStudentRow.id as string;

  const { data: topicRow, error: topicError } = await client
    .from('lesson_topics')
    .insert({
      app_id: topicAppId,
      title: `Dismiss Topic ${RUN_ID}`,
      sort_order: 999900 + (RUN_ID % 100),
      is_active: true,
    })
    .select('id')
    .single();

  if (topicError) {
    throw new Error(formatSupabaseOperationError('insert topic', topicError, config));
  }

  if (!topicRow) {
    throw new Error('insert topic returned no row');
  }

  const topicUuid = topicRow.id as string;

  const { data: testRow, error: testError } = await client
    .from('tests')
    .insert({
      app_id: testAppId,
      title: `Dismiss Test ${RUN_ID}`,
      test_type: 'homework',
      lesson_topic_id: topicUuid,
      version: 1,
      is_active: true,
      is_published: true,
    })
    .select('id')
    .single();

  if (testError) {
    throw new Error(formatSupabaseOperationError('insert test', testError, config));
  }

  if (!testRow) {
    throw new Error('insert test returned no row');
  }

  const testUuid = testRow.id as string;

  async function insertLesson(suffix: string, lessonAt: string) {
    const { data, error } = await client
      .from('lessons')
      .insert({
        app_id: `verify-dismiss-lesson-${suffix}-${RUN_ID}`,
        student_id: studentUuid,
        lesson_at: lessonAt,
        status: 'completed',
        payment_status: 'paid',
        lesson_type: 'regular',
        lesson_topic_id: topicUuid,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(formatSupabaseOperationError(`insert lesson ${suffix}`, error, config));
    }

    if (!data) {
      throw new Error(`insert lesson ${suffix} returned no row`);
    }

    return data.id as string;
  }

  const oldLessonUuid = await insertLesson('old', '2026-08-01T10:00:00.000Z');
  const newLessonUuid = await insertLesson('new', '2026-09-02T10:00:00.000Z');

  const { error: oldAssignmentError } = await client.from('test_assignments').insert({
    app_id: oldAssignmentAppId,
    test_id: testUuid,
    student_id: studentUuid,
    lesson_id: oldLessonUuid,
    status: 'assigned',
    source: 'lesson',
    created_at: '2026-08-01T10:00:00.000Z',
  });

  if (oldAssignmentError) {
    throw new Error(
      formatSupabaseOperationError('insert old assignment', oldAssignmentError, config),
    );
  }

  const { error: newAssignmentError } = await client.from('test_assignments').insert({
    app_id: newAssignmentAppId,
    test_id: testUuid,
    student_id: studentUuid,
    lesson_id: newLessonUuid,
    status: 'assigned',
    source: 'lesson',
    created_at: '2026-09-02T10:00:00.000Z',
  });

  if (newAssignmentError) {
    throw new Error(
      formatSupabaseOperationError('insert new assignment', newAssignmentError, config),
    );
  }

  const { error: otherAssignmentError } = await client.from('test_assignments').insert({
    app_id: otherAssignmentAppId,
    test_id: testUuid,
    student_id: otherStudentUuid,
    lesson_id: oldLessonUuid,
    status: 'assigned',
    source: 'lesson',
  });

  if (otherAssignmentError) {
    throw new Error(
      formatSupabaseOperationError('insert other assignment', otherAssignmentError, config),
    );
  }

  return {
    config,
    client,
    studentAppId,
    studentUuid,
    otherStudentAppId,
    otherStudentUuid,
    topicAppId,
    topicUuid,
    testUuid,
    testAppId,
    oldAssignmentAppId,
    newAssignmentAppId,
    otherAssignmentAppId,
  };
}

async function cleanupFixture(ctx: FixtureContext): Promise<void> {
  await ctx.client.from('test_assignments').delete().eq('test_id', ctx.testUuid);
  await ctx.client.from('lessons').delete().eq('student_id', ctx.studentUuid);
  await ctx.client.from('tests').delete().eq('id', ctx.testUuid);
  await ctx.client.from('lesson_topics').delete().eq('id', ctx.topicUuid);
  await ctx.client.from('students').delete().eq('app_id', ctx.studentAppId);
  await ctx.client.from('students').delete().eq('app_id', ctx.otherStudentAppId);
}

function buildHomeworkView(
  assignments: Array<{
    app_id: string;
    status: StudentHomeworkListItem['status'];
    source: 'lesson' | 'self';
    dismissed_at: string | null;
    created_at: string;
    lesson_at?: string;
  }>,
  topicAppId: string,
  testAppId: string,
): StudentHomeworkListItem[] {
  const latest = [...assignments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  if (!latest) return [];

  return [
    {
      topicId: topicAppId,
      topicTitle: 'Topic',
      testId: testAppId,
      assignmentId: latest.app_id,
      assignmentCreatedAt: latest.created_at,
      lessonDate: latest.lesson_at,
      status: latest.status,
      source: latest.source,
      dismissedAt: latest.dismissed_at ?? undefined,
    },
  ];
}

async function assertDismissedColumnExists(
  client: SupabaseClient,
  config: IntegrationSupabaseConfig,
): Promise<void> {
  const { error } = await client
    .from('test_assignments')
    .select('dismissed_at')
    .limit(1);

  if (error?.code === '42703') {
    throw new Error(
      'Missing test_assignments.dismissed_at. Apply supabase/migrations/20260902_test_assignments_dismissed_at.sql before running this verify.',
    );
  }

  if (error) {
    throw new Error(formatSupabaseOperationError('preflight dismissed_at', error, config));
  }
}

async function run() {
  bootstrapIntegrationProcessEnv();
  const config = resolveIntegrationSupabaseConfig(process.env);
  if (!config) {
    throw new Error('Missing Supabase integration config');
  }

  const client = createIntegrationSupabaseClient(config);
  await assertIntegrationSupabaseReachable(client, config);
  await assertDismissedColumnExists(client, config);

  const ctx = await seedFixture(client, config);

  try {
    const { data: assignmentsBefore, error: assignmentsBeforeError } = await client
      .from('test_assignments')
      .select('app_id, status, source, dismissed_at, created_at, lessons(lesson_at)')
      .eq('student_id', ctx.studentUuid)
      .eq('source', 'lesson');

    if (assignmentsBeforeError) {
      throw new Error(
        formatSupabaseOperationError('load assignments', assignmentsBeforeError, config),
      );
    }

    const homeworkBefore = buildHomeworkView(
      (assignmentsBefore ?? []).map((row) => ({
        app_id: row.app_id as string,
        status: row.status as StudentHomeworkListItem['status'],
        source: row.source as 'lesson' | 'self',
        dismissed_at: row.dismissed_at as string | null,
        created_at: row.created_at as string,
        lesson_at: (row.lessons as { lesson_at?: string } | null)?.lesson_at,
      })),
      ctx.topicAppId,
      ctx.testAppId,
    );

    assert.equal(getCurrentLessonHomework(homeworkBefore)?.assignmentId, ctx.newAssignmentAppId);
    assert.equal(getActiveHomeworkItems(homeworkBefore).length, 1);

    const { error: dismissError } = await client
      .from('test_assignments')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('app_id', ctx.newAssignmentAppId)
      .eq('student_id', ctx.studentUuid);

    if (dismissError) {
      throw new Error(formatSupabaseOperationError('dismiss assignment', dismissError, config));
    }

    const { count: assignmentCount, error: countError } = await client
      .from('test_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('app_id', ctx.newAssignmentAppId);
    assert.ifError(countError);
    assert.equal(assignmentCount, 1);

    const { count: testCount, error: testCountError } = await client
      .from('tests')
      .select('*', { count: 'exact', head: true })
      .eq('app_id', ctx.testAppId);
    assert.ifError(testCountError);
    assert.equal(testCount, 1);

    const { data: assignmentsAfterDismiss, error: assignmentsAfterDismissError } =
      await client
        .from('test_assignments')
        .select('app_id, status, source, dismissed_at, created_at, lessons(lesson_at)')
        .eq('student_id', ctx.studentUuid)
        .eq('source', 'lesson');

    if (assignmentsAfterDismissError) {
      throw new Error(
        formatSupabaseOperationError(
          'load assignments after dismiss',
          assignmentsAfterDismissError,
          config,
        ),
      );
    }

    const homeworkAfterDismiss = buildHomeworkView(
      (assignmentsAfterDismiss ?? []).map((row) => ({
        app_id: row.app_id as string,
        status: row.status as StudentHomeworkListItem['status'],
        source: row.source as 'lesson' | 'self',
        dismissed_at: row.dismissed_at as string | null,
        created_at: row.created_at as string,
        lesson_at: (row.lessons as { lesson_at?: string } | null)?.lesson_at,
      })),
      ctx.topicAppId,
      ctx.testAppId,
    );

    assert.ok(homeworkAfterDismiss[0]?.dismissedAt);
    assert.equal(getActiveHomeworkItems(homeworkAfterDismiss).length, 0);

    const { count: foreignCount, error: foreignError } = await client
      .from('test_assignments')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('app_id', ctx.otherAssignmentAppId)
      .eq('student_id', ctx.studentUuid);

    assert.ifError(foreignError);
    assert.equal(foreignCount, 0);

    const reassignLessonUuid = await (async () => {
      const { data, error } = await client
        .from('lessons')
        .insert({
          app_id: `verify-dismiss-lesson-reassign-${RUN_ID}`,
          student_id: ctx.studentUuid,
          lesson_at: '2026-09-03T10:00:00.000Z',
          status: 'completed',
          payment_status: 'paid',
          lesson_type: 'regular',
          lesson_topic_id: ctx.topicUuid,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(formatSupabaseOperationError('insert reassigned lesson', error, config));
      }

      if (!data) {
        throw new Error('insert reassigned lesson returned no row');
      }

      return data.id as string;
    })();

    const reassignAppId = `verify-dismiss-asg-reassign-${RUN_ID}`;
    const { error: reassignedError } = await client.from('test_assignments').insert({
      app_id: reassignAppId,
      test_id: ctx.testUuid,
      student_id: ctx.studentUuid,
      lesson_id: reassignLessonUuid,
      status: 'assigned',
      source: 'lesson',
      created_at: '2026-09-03T10:00:00.000Z',
    });

    if (reassignedError) {
      throw new Error(
        formatSupabaseOperationError('insert reassigned assignment', reassignedError, config),
      );
    }

    const { data: assignmentsAfterReassign, error: assignmentsAfterReassignError } =
      await client
        .from('test_assignments')
        .select('app_id, status, source, dismissed_at, created_at, lessons(lesson_at)')
        .eq('student_id', ctx.studentUuid)
        .eq('source', 'lesson');

    if (assignmentsAfterReassignError) {
      throw new Error(
        formatSupabaseOperationError(
          'load assignments after reassign',
          assignmentsAfterReassignError,
          config,
        ),
      );
    }

    const homeworkAfterReassign = buildHomeworkView(
      (assignmentsAfterReassign ?? []).map((row) => ({
        app_id: row.app_id as string,
        status: row.status as StudentHomeworkListItem['status'],
        source: row.source as 'lesson' | 'self',
        dismissed_at: row.dismissed_at as string | null,
        created_at: row.created_at as string,
        lesson_at: (row.lessons as { lesson_at?: string } | null)?.lesson_at,
      })),
      ctx.topicAppId,
      ctx.testAppId,
    );

    assert.equal(getCurrentLessonHomework(homeworkAfterReassign)?.assignmentId, reassignAppId);
    assert.equal(getActiveHomeworkItems(homeworkAfterReassign).length, 1);

    console.log('verify-test-assignment-dismiss: all checks passed');
  } finally {
    await cleanupFixture(ctx);
  }
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
