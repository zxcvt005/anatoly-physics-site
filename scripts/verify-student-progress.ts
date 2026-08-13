import assert from 'node:assert/strict';
import {
  computeStudentProgressStats,
  formatAverageHomeworkPercent,
} from '../src/lib/student-progress';
import type { Lesson } from '../src/types/tutor';

function baseLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'l1',
    studentId: 's1',
    date: '2026-08-07T10:00:00',
    status: 'completed',
    paymentStatus: 'paid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    attendance: 'present',
    ...overrides,
  };
}

function testLegacyOnlyDoesNotAffectAverage() {
  const stats = computeStudentProgressStats([
    baseLesson({
      homeworkStatus: 'done',
      homeworkScore: 9,
    }),
    baseLesson({
      id: 'l2',
      homeworkStatus: 'partial',
      homeworkScore: 6,
    }),
  ]);

  assert.equal(stats.averageHomeworkPercent, null);
  assert.equal(formatAverageHomeworkPercent(stats.averageHomeworkPercent), 'Пока нет выполненных ДЗ');
}

function testSingleCompletedHomework80() {
  const stats = computeStudentProgressStats([
    baseLesson({
      lessonTopicId: 'topic-1',
      homeworkPointsEarned: 8,
      homeworkPointsMax: 10,
      homeworkPercent: 80,
    }),
  ]);

  assert.equal(stats.averageHomeworkPercent, 80);
  assert.equal(formatAverageHomeworkPercent(stats.averageHomeworkPercent), '80%');
}

function testTwoCompletedHomeworkAverage90() {
  const stats = computeStudentProgressStats([
    baseLesson({
      lessonTopicId: 'topic-1',
      homeworkPointsEarned: 8,
      homeworkPointsMax: 10,
      homeworkPercent: 80,
    }),
    baseLesson({
      id: 'l2',
      lessonTopicId: 'topic-2',
      homeworkPointsEarned: 10,
      homeworkPointsMax: 10,
      homeworkPercent: 100,
    }),
  ]);

  assert.equal(stats.averageHomeworkPercent, 90);
}

function testAssignedDoesNotAffectAverage() {
  const stats = computeStudentProgressStats([
    baseLesson({
      lessonTopicId: 'topic-1',
      homeworkPointsEarned: 8,
      homeworkPointsMax: 10,
      homeworkPercent: 80,
    }),
    baseLesson({
      id: 'l2',
      lessonTopicId: 'topic-2',
    }),
  ]);

  assert.equal(stats.averageHomeworkPercent, 80);
  assert.equal(stats.homeworkNotDoneCount, 1);
}

function testInProgressScheduledDoesNotAffectAverage() {
  const stats = computeStudentProgressStats([
    baseLesson({
      lessonTopicId: 'topic-1',
      homeworkPointsEarned: 8,
      homeworkPointsMax: 10,
      homeworkPercent: 80,
    }),
    baseLesson({
      id: 'l2',
      status: 'scheduled',
      lessonTopicId: 'topic-2',
      homeworkPointsEarned: 10,
      homeworkPointsMax: 10,
      homeworkPercent: 100,
    }),
  ]);

  assert.equal(stats.averageHomeworkPercent, 80);
}

function testIntensiveDoesNotAffectAverage() {
  const stats = computeStudentProgressStats([
    baseLesson({
      lessonTopicId: 'topic-1',
      homeworkPointsEarned: 8,
      homeworkPointsMax: 10,
      homeworkPercent: 80,
    }),
  ]);

  assert.equal(stats.averageHomeworkPercent, 80);
}

function testSelfAttemptSnapshotNotOnLessonDoesNotAffectAverage() {
  const stats = computeStudentProgressStats([
    baseLesson({
      lessonTopicId: 'topic-1',
      homeworkPointsEarned: 8,
      homeworkPointsMax: 10,
      homeworkPercent: 80,
    }),
  ]);

  assert.equal(stats.averageHomeworkPercent, 80);
}

function testLegacyPlusNewCountsOnlyNew() {
  const stats = computeStudentProgressStats([
    baseLesson({
      homeworkStatus: 'done',
      homeworkScore: 10,
    }),
    baseLesson({
      id: 'l2',
      lessonTopicId: 'topic-1',
      homeworkPointsEarned: 7,
      homeworkPointsMax: 10,
      homeworkPercent: 70,
    }),
  ]);

  assert.equal(stats.averageHomeworkPercent, 70);
}

function testAfterLegacyCleanupNewResultsRemain() {
  const beforeCleanup = computeStudentProgressStats([
    baseLesson({
      lessonTopicId: 'topic-1',
      homeworkStatus: 'done',
      homeworkScore: 10,
      homeworkPointsEarned: 9,
      homeworkPointsMax: 10,
      homeworkPercent: 90,
    }),
  ]);

  assert.equal(beforeCleanup.averageHomeworkPercent, 90);

  const afterCleanup = computeStudentProgressStats([
    baseLesson({
      lessonTopicId: 'topic-1',
      homeworkStatus: undefined,
      homeworkScore: undefined,
      homeworkPointsEarned: 9,
      homeworkPointsMax: 10,
      homeworkPercent: 90,
    }),
  ]);

  assert.equal(afterCleanup.averageHomeworkPercent, 90);
}

function run() {
  testLegacyOnlyDoesNotAffectAverage();
  testSingleCompletedHomework80();
  testTwoCompletedHomeworkAverage90();
  testAssignedDoesNotAffectAverage();
  testInProgressScheduledDoesNotAffectAverage();
  testIntensiveDoesNotAffectAverage();
  testSelfAttemptSnapshotNotOnLessonDoesNotAffectAverage();
  testLegacyPlusNewCountsOnlyNew();
  testAfterLegacyCleanupNewResultsRemain();
  console.log('verify-student-progress: all checks passed');
}

run();
