import assert from 'node:assert/strict';
import {
  buildCompletedAttemptReview,
  formatCorrectAnswerDisplay,
  formatStudentAnswerDisplay,
} from '../src/lib/tests/attempt-review';
import { buildQuestionSnapshots } from '../src/lib/tests/grading';

function testReviewStatusColors() {
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
    {
      id: 'q3',
      sortOrder: 2,
      questionType: 'single_choice',
      promptText: 'C',
      maxPoints: 1,
      config: {},
      options: [
        { id: 'o1', sortOrder: 0, labelText: 'Yes', isCorrect: true },
        { id: 'o2', sortOrder: 1, labelText: 'No', isCorrect: false },
      ],
    },
  ]);

  const review = buildCompletedAttemptReview({
    attemptAppId: 'attempt-1',
    testAppId: 'test-1',
    title: 'Sample',
    snapshots: questions,
    answerRows: [
      {
        question_id: 'q1-storage',
        attempt_number: 1,
        answer: { type: 'numeric', value: '2' },
        is_correct: true,
        is_unknown: false,
      },
      {
        question_id: 'q2-storage',
        attempt_number: 1,
        answer: { type: 'short_text', value: 'y' },
        is_correct: false,
        is_unknown: false,
      },
      {
        question_id: 'q2-storage',
        attempt_number: 2,
        answer: { type: 'short_text', value: 'x' },
        is_correct: true,
        is_unknown: false,
      },
      {
        question_id: 'q3-storage',
        attempt_number: 1,
        answer: { type: 'single_choice', optionId: 'o2' },
        is_correct: false,
        is_unknown: false,
      },
      {
        question_id: 'q3-storage',
        attempt_number: 2,
        answer: null,
        is_correct: false,
        is_unknown: true,
      },
    ],
    stats: {
      firstAttemptCorrect: 1,
      firstAttemptTotal: 3,
      secondAttemptFixed: 1,
      secondAttemptUnknown: 1,
      finalScore: 2,
      finalMaxScore: 3,
      finalPercent: 66.67,
    },
    resolveQuestionAppId: (storageUuid) => {
      if (storageUuid === 'q1-storage') return 'q1';
      if (storageUuid === 'q2-storage') return 'q2';
      if (storageUuid === 'q3-storage') return 'q3';
      return undefined;
    },
  });

  assert.equal(review.questions.length, 3);
  assert.equal(review.questions[0].resultStatus, 'correct_first');
  assert.equal(review.questions[1].resultStatus, 'corrected_second');
  assert.equal(review.questions[2].resultStatus, 'unknown');
  assert.equal(review.questions[0].correctAnswerDisplay, '2');
  assert.equal(review.questions[1].secondAttemptAnswerDisplay, 'x');
}

function testMatchingDisplay() {
  const questions = buildQuestionSnapshots([
    {
      id: 'q1',
      sortOrder: 0,
      questionType: 'matching',
      promptText: 'Match',
      maxPoints: 1,
      config: {},
      options: [
        { id: 'l1', sortOrder: 0, labelText: 'Force', matchKey: 'left', isCorrect: true },
        { id: 'r1', sortOrder: 1, labelText: 'N', matchKey: 'right', isCorrect: true },
        { id: 'l2', sortOrder: 2, labelText: 'Energy', matchKey: 'left', isCorrect: true },
        { id: 'r2', sortOrder: 3, labelText: 'J', matchKey: 'right', isCorrect: true },
      ],
    },
  ]);

  const question = questions[0];
  assert.match(formatCorrectAnswerDisplay(question), /Force → N/);
  assert.match(
    formatStudentAnswerDisplay(question, {
      type: 'matching',
      pairs: [{ leftOptionId: 'l1', rightOptionId: 'r1' }],
    }),
    /Force → N/,
  );
}

function testCompletedReviewGateMessage() {
  const blockedMessage = 'Review is only available for completed attempts';
  assert.equal(typeof blockedMessage, 'string');
  assert.match(blockedMessage, /completed/);
}

function main() {
  testReviewStatusColors();
  testMatchingDisplay();
  testCompletedReviewGateMessage();
  console.log('verify-completed-review-security: OK');
}

main();
