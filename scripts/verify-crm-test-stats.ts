import assert from 'node:assert/strict';
import { resolveFinalQuestionOutcome } from '../src/lib/tests/attempt-review';
import { isAssistantAllowedCrmApiRequest } from '../src/lib/auth/crm-access/request-access';
import {
  averageCompletedPercents,
  buildQuestionStatsFromOutcomes,
  classifyAttemptQuestionOutcome,
  matchesTestStatsSearch,
  sortQuestionStats,
  sortTestStatsByRecency,
  type CrmTestStatsListItem,
} from '../src/lib/tests/crm-test-stats';

function testAverageOnlyCompletedPercents() {
  assert.equal(averageCompletedPercents([80, 90, 70]), 80);
  assert.equal(averageCompletedPercents([]), null);
  assert.equal(averageCompletedPercents([100]), 100);
}

function testListSortingNewestFirst() {
  const items: CrmTestStatsListItem[] = [
    {
      testId: 'old',
      title: 'Кинематика',
      completedCount: 2,
      avgPercent: 84,
      latestCompletedAt: '2026-09-01T10:00:00.000Z',
    },
    {
      testId: 'new',
      title: 'Динамика',
      completedCount: 12,
      avgPercent: 78,
      latestCompletedAt: '2026-09-07T10:00:00.000Z',
    },
  ];

  const sorted = sortTestStatsByRecency(items);
  assert.equal(sorted[0].testId, 'new');
  assert.equal(sorted[1].testId, 'old');
}

function testQuestionOutcomesMatchReviewLogic() {
  assert.equal(
    classifyAttemptQuestionOutcome({ firstCorrect: true }),
    'correct',
  );
  assert.equal(
    classifyAttemptQuestionOutcome({
      firstCorrect: false,
      secondRow: { is_correct: true, is_unknown: false },
    }),
    'correct',
  );
  assert.equal(
    classifyAttemptQuestionOutcome({
      firstCorrect: false,
      secondRow: { is_correct: false, is_unknown: true },
    }),
    'skipped',
  );
  assert.equal(
    classifyAttemptQuestionOutcome({
      firstCorrect: false,
      secondRow: { is_correct: false, is_unknown: false },
    }),
    'incorrect',
  );
  assert.equal(
    classifyAttemptQuestionOutcome({ firstCorrect: false }),
    'incorrect',
  );

  assert.equal(
    resolveFinalQuestionOutcome({ firstCorrect: true }),
    classifyAttemptQuestionOutcome({ firstCorrect: true }),
  );
}

function testQuestionAggregationAndDifficultySort() {
  const hard = buildQuestionStatsFromOutcomes({
    questionId: 'q7',
    sortOrder: 6,
    promptText: 'Hard',
    questionType: 'numeric',
    correctAnswerDisplay: '1',
    outcomes: [
      'incorrect',
      'incorrect',
      'correct',
      'skipped',
      'incorrect',
      'incorrect',
      'incorrect',
      'incorrect',
      'incorrect',
      'incorrect',
      'incorrect',
      'incorrect',
    ],
  });

  assert.equal(hard.number, 7);
  assert.equal(hard.attempted, 12);
  assert.equal(hard.correct, 1);
  assert.equal(hard.incorrect, 10);
  assert.equal(hard.skipped, 1);
  assert.equal(hard.correctPercent, Math.round((1 / 12) * 10000) / 100);

  const easy = buildQuestionStatsFromOutcomes({
    questionId: 'q1',
    sortOrder: 0,
    promptText: 'Easy',
    questionType: 'numeric',
    correctAnswerDisplay: '2',
    outcomes: Array.from({ length: 12 }, () => 'correct' as const),
  });

  assert.equal(easy.correctPercent, 100);

  const byDifficulty = sortQuestionStats([easy, hard], 'difficulty');
  assert.equal(byDifficulty[0].questionId, 'q7');
  assert.equal(byDifficulty[1].questionId, 'q1');

  const byOrder = sortQuestionStats([hard, easy], 'order');
  assert.equal(byOrder[0].questionId, 'q1');
  assert.equal(byOrder[1].questionId, 'q7');
}

function testSearch() {
  assert.equal(
    matchesTestStatsSearch(
      { title: 'Механика — Динамика', sectionTitle: 'Механика' },
      'динами',
    ),
    true,
  );
  assert.equal(
    matchesTestStatsSearch({ title: 'Кинематика' }, 'оптика'),
    false,
  );
}

function testAssistantCannotAccessTestStatsApi() {
  assert.equal(
    isAssistantAllowedCrmApiRequest('GET', '/api/crm/grades'),
    true,
  );
  assert.equal(
    isAssistantAllowedCrmApiRequest('GET', '/api/crm/grades/tests'),
    false,
  );
  assert.equal(
    isAssistantAllowedCrmApiRequest('GET', '/api/crm/grades/tests/t1'),
    false,
  );
}

function testCompletedOnlySemantics() {
  // Assigned / in-progress never contribute percents — empty list → null avg.
  assert.equal(averageCompletedPercents([]), null);
  // Only explicit completed percents are averaged.
  assert.equal(averageCompletedPercents([90, 70]), 80);
}

testAverageOnlyCompletedPercents();
testListSortingNewestFirst();
testQuestionOutcomesMatchReviewLogic();
testQuestionAggregationAndDifficultySort();
testSearch();
testAssistantCannotAccessTestStatsApi();
testCompletedOnlySemantics();

console.log('verify-crm-test-stats: all checks passed');
