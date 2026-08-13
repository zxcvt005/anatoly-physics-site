import assert from 'node:assert/strict';
import {
  assertNoAnswerKeyInStudentPayload,
  buildQuestionSnapshots,
  computeFinalStats,
  gradeAnswer,
  gradeNumericAnswer,
  gradeShortTextAnswer,
  toStudentQuestion,
  validateQuestionInput,
} from '../src/lib/tests/grading';
import {
  formatLessonHomeworkLabel,
  isLegacyHomeworkNotDone,
  isNewHomeworkLesson,
} from '../src/lib/tests/homework-display';
import type { TestQuestion } from '../src/types/tests';
import type { Lesson as TutorLesson } from '../src/types/tutor';

function testNumericTolerance() {
  const result = gradeNumericAnswer(
    { correctValue: 3.6, tolerance: 0.05 },
    { type: 'numeric', value: '3.58' },
  );
  assert.equal(result.isCorrect, true);

  const fail = gradeNumericAnswer(
    { correctValue: 3.6, tolerance: 0.05 },
    { type: 'numeric', value: '3.50' },
  );
  assert.equal(fail.isCorrect, false);
}

function testShortTextNormalization() {
  const result = gradeShortTextAnswer(
    { acceptedAnswers: ['Hello World'], caseInsensitive: true },
    { type: 'short_text', value: '  hello   world ' },
  );
  assert.equal(result.isCorrect, true);
}

function testAttemptFlow() {
  const questions = buildQuestionSnapshots([
    {
      id: 'q1',
      sortOrder: 0,
      questionType: 'numeric',
      promptText: 'A',
      maxPoints: 1,
      config: { correctValue: 2 },
      options: [],
    },
    {
      id: 'q2',
      sortOrder: 1,
      questionType: 'short_text',
      promptText: 'B',
      maxPoints: 1,
      config: { acceptedAnswers: ['x'] },
      options: [],
    },
  ]);

  const first = new Map<string, { isCorrect: boolean; pointsEarned: number }>();
  first.set('q1', gradeAnswer(questions[0], { type: 'numeric', value: '2' }, 1));
  first.set('q2', gradeAnswer(questions[1], { type: 'short_text', value: 'y' }, 1));

  const second = new Map<
    string,
    { isCorrect: boolean; pointsEarned: number; isUnknown: boolean }
  >();
  second.set('q2', {
    ...gradeAnswer(questions[1], { type: 'short_text', value: 'x' }, 1),
    isUnknown: false,
  });

  const stats = computeFinalStats({
    questions,
    firstAttemptAnswers: first,
    secondAttemptAnswers: second,
  });

  assert.equal(stats.firstAttemptCorrect, 1);
  assert.equal(stats.secondAttemptFixed, 1);
  assert.equal(stats.finalScore, 2);
  assert.equal(stats.finalMaxScore, 2);
  assert.equal(stats.finalPercent, 100);
}

function testStudentPayloadHasNoAnswerKey() {
  const question: TestQuestion = {
    id: 'q1',
    sortOrder: 0,
    questionType: 'single_choice',
    promptText: 'Pick',
    maxPoints: 1,
    config: {},
    options: [
      { id: 'o1', sortOrder: 0, labelText: 'A', isCorrect: true },
      { id: 'o2', sortOrder: 1, labelText: 'B', isCorrect: false },
    ],
  };

  const studentQuestion = toStudentQuestion(question);
  assert.equal(assertNoAnswerKeyInStudentPayload(studentQuestion), true);
}

function testHomeworkLegacySeparation() {
  const newAssigned: TutorLesson = {
    id: 'l1',
    studentId: 's1',
    date: '2026-08-07T10:00:00',
    status: 'completed',
    paymentStatus: 'paid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    lessonTopicId: 'topic-1',
    attendance: 'present',
    homeworkStatus: 'done',
    homeworkScore: 10,
  };

  assert.equal(isNewHomeworkLesson(newAssigned), true);
  assert.equal(formatLessonHomeworkLabel(newAssigned), 'ДЗ: Назначено');
  assert.equal(isLegacyHomeworkNotDone(newAssigned), false);

  const legacyNotDone: TutorLesson = {
    ...newAssigned,
    lessonTopicId: undefined,
    homeworkStatus: 'not_done',
    homeworkScore: undefined,
  };

  assert.equal(formatLessonHomeworkLabel(legacyNotDone), 'ДЗ: —');
  assert.equal(isLegacyHomeworkNotDone(legacyNotDone), false);

  const newCompleted: TutorLesson = {
    ...newAssigned,
    homeworkPointsEarned: 18,
    homeworkPointsMax: 20,
    homeworkPercent: 90,
  };

  assert.equal(
    formatLessonHomeworkLabel(newCompleted),
    'ДЗ: 18 / 20 — 90%',
  );
}

function testStudentPayloadBlocksSnapshotFields() {
  const payload = {
    attempt: { id: 'a1' },
    questions: [{ id: 'q1', config: { correctValue: 1 } }],
    question_snapshot: [{ isCorrect: true }],
  };

  assert.equal(assertNoAnswerKeyInStudentPayload(payload), false);
}

function testQuestionValidation() {
  assert.equal(
    validateQuestionInput('numeric', { correctValue: 1 }, []),
    null,
  );
  assert.equal(
    validateQuestionInput(
      'single_choice',
      {},
      [
        { id: '1', sortOrder: 0, labelText: 'A', isCorrect: true },
        { id: '2', sortOrder: 1, labelText: 'B', isCorrect: false },
      ],
    ),
    null,
  );
}

function run() {
  testNumericTolerance();
  testShortTextNormalization();
  testAttemptFlow();
  testStudentPayloadHasNoAnswerKey();
  testHomeworkLegacySeparation();
  testStudentPayloadBlocksSnapshotFields();
  testQuestionValidation();
  console.log('verify-tests-system: all checks passed');
}

run();
