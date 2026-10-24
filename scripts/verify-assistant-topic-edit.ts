/**
 * Editing a saved attendance mark must keep the topic field editable
 * and must not silently duplicate or replace homework.
 *
 * Run: npm run verify:assistant-topic-edit
 */
import assert from 'node:assert/strict';
import { buildCompletedLessonFromMarking } from '../src/lib/lesson-marking-apply';
import {
  decideLessonHomeworkAssignmentSync,
  shouldClearLessonHomeworkSnapshot,
} from '../src/lib/tests/homework-reassign';
import { syncHomeworkAssignmentAfterMarking } from '../src/lib/tests/sync-assignment';
import {
  formatTopicOptionLabel,
  getTopicSearchNeedle,
  shouldApplyHydratedTopic,
} from '../src/lib/tests/topic-autocomplete-state';
import type { Lesson } from '../src/types/tutor';
import type { LessonTopic } from '../src/types/tests';

function baseLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'l1',
    studentId: 's1',
    date: '2026-10-24T17:00:00+03:00',
    status: 'completed',
    paymentStatus: 'paid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    attendance: 'present',
    topic: 'Кинематика',
    lessonTopicId: 'topic-old',
    homeworkPointsEarned: 18,
    homeworkPointsMax: 20,
    homeworkPercent: 90,
    ...overrides,
  };
}

function testHydrationDoesNotOverrideUserEdits() {
  assert.equal(
    shouldApplyHydratedTopic({
      requestedValue: 'topic-old',
      selectedId: undefined,
      userEdited: false,
    }),
    true,
  );

  assert.equal(
    shouldApplyHydratedTopic({
      requestedValue: 'topic-old',
      selectedId: 'topic-old',
      userEdited: false,
    }),
    false,
  );

  assert.equal(
    shouldApplyHydratedTopic({
      requestedValue: 'topic-old',
      selectedId: undefined,
      userEdited: true,
    }),
    false,
  );

  assert.equal(
    shouldApplyHydratedTopic({
      requestedValue: 'topic-old',
      selectedId: 'topic-new',
      userEdited: true,
    }),
    false,
  );

  assert.equal(
    shouldApplyHydratedTopic({
      requestedValue: undefined,
      selectedId: undefined,
      userEdited: false,
    }),
    false,
  );
}

function testTopicSearchUsesTitleAfterSectionPrefix() {
  assert.equal(getTopicSearchNeedle('Кинематика'), 'Кинематика');
  assert.equal(getTopicSearchNeedle('Механика → Кинематика'), 'Кинематика');
  assert.equal(getTopicSearchNeedle('  Механика →  '), 'Механика →');

  const topic: LessonTopic = {
    id: 'topic-1',
    title: 'Кинематика',
    sortOrder: 0,
    isActive: true,
    sectionTitle: 'Механика',
  };
  assert.equal(formatTopicOptionLabel(topic), 'Механика → Кинематика');
  assert.equal(
    formatTopicOptionLabel({ ...topic, sectionTitle: undefined }),
    'Кинематика',
  );
}

function testResaveSameTopicKeepsHomeworkSnapshot() {
  const lesson = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: true,
    topic: 'Кинематика',
    lessonTopicId: 'topic-old',
  });

  assert.equal(lesson.topic, 'Кинематика');
  assert.equal(lesson.lessonTopicId, 'topic-old');
  assert.equal(lesson.homeworkPointsEarned, 18);
  assert.equal(lesson.homeworkPointsMax, 20);
  assert.equal(lesson.homeworkPercent, 90);
}

function testTopicChangeWithoutReassignKeepsHomeworkSnapshot() {
  const lesson = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: true,
    topic: 'Динамика',
    lessonTopicId: 'topic-new',
  });

  assert.equal(lesson.topic, 'Динамика');
  assert.equal(lesson.lessonTopicId, 'topic-new');
  assert.equal(lesson.homeworkPointsEarned, 18);
  assert.equal(lesson.homeworkPointsMax, 20);
  assert.equal(lesson.homeworkPercent, 90);
}

function testTopicChangeWithReassignClearsHomeworkSnapshot() {
  const lesson = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: true,
    topic: 'Динамика',
    lessonTopicId: 'topic-new',
    reassignHomework: true,
  });

  assert.equal(lesson.topic, 'Динамика');
  assert.equal(lesson.lessonTopicId, 'topic-new');
  assert.equal(lesson.homeworkPointsEarned, undefined);
  assert.equal(lesson.homeworkPointsMax, undefined);
  assert.equal(lesson.homeworkPercent, undefined);
}

function testSameTopicReassignDoesNotClearSnapshot() {
  const lesson = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: true,
    topic: 'Кинематика',
    lessonTopicId: 'topic-old',
    reassignHomework: true,
  });

  assert.equal(lesson.homeworkPointsEarned, 18);
  assert.equal(lesson.homeworkPercent, 90);
}

function testAssignmentDecisions() {
  const unused = {
    id: 'asg-1',
    testId: 'test-old',
    status: 'assigned' as const,
    hasAttempts: false,
  };
  const inProgress = {
    id: 'asg-2',
    testId: 'test-old',
    status: 'in_progress' as const,
    hasAttempts: true,
  };
  const completed = {
    id: 'asg-3',
    testId: 'test-old',
    status: 'completed' as const,
    hasAttempts: true,
  };

  assert.deepEqual(
    decideLessonHomeworkAssignmentSync({
      existing: null,
      newTestId: 'test-new',
      reassignHomework: false,
    }),
    { type: 'create' },
  );

  assert.deepEqual(
    decideLessonHomeworkAssignmentSync({
      existing: unused,
      newTestId: 'test-old',
      reassignHomework: false,
    }),
    { type: 'skip' },
  );

  assert.deepEqual(
    decideLessonHomeworkAssignmentSync({
      existing: unused,
      newTestId: 'test-new',
      reassignHomework: false,
    }),
    { type: 'skip' },
  );

  assert.deepEqual(
    decideLessonHomeworkAssignmentSync({
      existing: unused,
      newTestId: 'test-new',
      reassignHomework: true,
    }),
    { type: 'update-test', assignmentId: 'asg-1' },
  );

  assert.deepEqual(
    decideLessonHomeworkAssignmentSync({
      existing: inProgress,
      newTestId: 'test-new',
      reassignHomework: true,
    }),
    { type: 'detach-and-create', assignmentId: 'asg-2', dismiss: true },
  );

  assert.deepEqual(
    decideLessonHomeworkAssignmentSync({
      existing: completed,
      newTestId: 'test-new',
      reassignHomework: true,
    }),
    { type: 'detach-and-create', assignmentId: 'asg-3', dismiss: false },
  );

  assert.deepEqual(
    decideLessonHomeworkAssignmentSync({
      existing: unused,
      newTestId: null,
      reassignHomework: true,
    }),
    { type: 'skip' },
  );

  assert.equal(
    shouldClearLessonHomeworkSnapshot({ type: 'skip' }),
    false,
  );
  assert.equal(
    shouldClearLessonHomeworkSnapshot({ type: 'create' }),
    false,
  );
  assert.equal(
    shouldClearLessonHomeworkSnapshot({
      type: 'update-test',
      assignmentId: 'asg-1',
    }),
    true,
  );
  assert.equal(
    shouldClearLessonHomeworkSnapshot({
      type: 'detach-and-create',
      assignmentId: 'asg-2',
      dismiss: true,
    }),
    true,
  );
}

async function testSyncPassesReassignFlag() {
  const originalFetch = globalThis.fetch;
  const bodies: unknown[] = [];

  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof init?.body === 'string') {
      bodies.push(JSON.parse(init.body));
    }
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true, data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }) as typeof fetch;

  try {
    await syncHomeworkAssignmentAfterMarking('l1', 's1', {
      wasPresent: true,
      lessonTopicId: 'topic-old',
    });
    await syncHomeworkAssignmentAfterMarking('l1', 's1', {
      wasPresent: true,
      lessonTopicId: 'topic-new',
      reassignHomework: true,
    });
    await syncHomeworkAssignmentAfterMarking('l1', 's1', {
      wasPresent: false,
      lessonTopicId: 'topic-new',
      reassignHomework: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0], {
    studentId: 's1',
    lessonId: 'l1',
    topicId: 'topic-old',
    reassignHomework: false,
  });
  assert.deepEqual(bodies[1], {
    studentId: 's1',
    lessonId: 'l1',
    topicId: 'topic-new',
    reassignHomework: true,
  });
}

async function run() {
  testHydrationDoesNotOverrideUserEdits();
  testTopicSearchUsesTitleAfterSectionPrefix();
  testResaveSameTopicKeepsHomeworkSnapshot();
  testTopicChangeWithoutReassignKeepsHomeworkSnapshot();
  testTopicChangeWithReassignClearsHomeworkSnapshot();
  testSameTopicReassignDoesNotClearSnapshot();
  testAssignmentDecisions();
  await testSyncPassesReassignFlag();
  console.log('verify-assistant-topic-edit: all checks passed');
}

run();
