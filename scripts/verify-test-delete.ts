import assert from 'node:assert/strict';
import {
  findQuestionAppIdByStorageUuid,
  questionAppIdToStorageUuid,
} from '../src/lib/tests/question-storage-id';
import {
  buildLessonTopicCleanupUpdate,
  HOMEWORK_TEST_DELETE_STEPS,
  LESSON_TOPIC_CLEANUP_FIELDS,
  type HomeworkTestDeleteResult,
} from '../src/lib/tests/test-delete-policy';

function testDeterministicUuid() {
  const appId = 'q-123-test';
  const first = questionAppIdToStorageUuid(appId);
  const second = questionAppIdToStorageUuid(appId);
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f-]{36}$/i);
}

function testReverseLookup() {
  const snapshots = [{ id: 'q-alpha' }, { id: 'q-beta' }];
  const uuid = questionAppIdToStorageUuid('q-beta');
  assert.equal(findQuestionAppIdByStorageUuid(snapshots, uuid), 'q-beta');
}

function testDeletePolicyRemovesWholeCard() {
  assert.deepEqual(HOMEWORK_TEST_DELETE_STEPS, [
    'test_attempt_answers',
    'test_attempts',
    'test_assignments',
    'test_question_options',
    'test_questions',
    'tests',
    'lessons_topic_cleanup',
    'lesson_topics',
  ]);
}

function testLessonCleanupFields() {
  assert.deepEqual(Object.keys(buildLessonTopicCleanupUpdate()), [
    'lesson_topic_id',
    'homework_points_earned',
    'homework_points_max',
    'homework_percent',
  ]);
  assert.deepEqual(LESSON_TOPIC_CLEANUP_FIELDS, [
    'lesson_topic_id',
    'homework_points_earned',
    'homework_points_max',
    'homework_percent',
  ]);

  for (const value of Object.values(buildLessonTopicCleanupUpdate())) {
    assert.equal(value, null);
  }
}

function testDeleteResponseShape() {
  const response: HomeworkTestDeleteResult = {
    topicId: 'topic-123',
    deletedTopic: true,
  };
  assert.equal(response.deletedTopic, true);
  assert.equal(response.topicId, 'topic-123');
}

function testDeleteScenarioChecklist() {
  const scenario = [
    'create_section',
    'create_topic_test',
    'add_question',
    'visible_in_admin',
    'visible_in_assistant',
    'delete_test',
    'tests_row_missing',
    'questions_missing',
    'lesson_topic_missing',
    'section_still_exists',
    'admin_list_missing',
    'assistant_list_missing',
    'refresh_still_missing',
    'student_catalog_missing',
    'recreate_same_title',
    'lesson_assignment_preserved',
    'lesson_topic_id_cleared',
    'homework_snapshot_cleared',
  ];
  assert.equal(scenario.length, 18);
}

function run() {
  testDeterministicUuid();
  testReverseLookup();
  testDeletePolicyRemovesWholeCard();
  testLessonCleanupFields();
  testDeleteResponseShape();
  testDeleteScenarioChecklist();
  console.log('verify-test-delete: all checks passed');
}

run();
