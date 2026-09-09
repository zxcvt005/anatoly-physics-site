import type {
  AnswerMap,
  ManualQuestionRule,
  ManualScoreMap,
  QuestionCheckType,
  QuestionRule,
} from '@/lib/tools/ege-checker/types';

export const QUESTION_COUNT = 20;
/** Official max for EGE physics part 1 (2026): 12×1 + 8×2 = 28. */
export const TOTAL_MAX_SCORE = 28;
export const FIRST_PART_MAX_SCORE = TOTAL_MAX_SCORE;
/** Official max for EGE physics part 2 (2026): 3+2+2+3+3+4 = 17. */
export const SECOND_PART_MAX_SCORE = 17;
/** Full exam primary maximum: 28 + 17 = 45. */
export const EXAM_PRIMARY_MAX_SCORE = 45;
export const EXAM_TEST_MAX_SCORE = 100;

export const EGE_CHECKER_STORAGE_KEY = 'ege-checker-reference-answers';
export const EGE_CHECKER_STORAGE_VERSION = 1;

/**
 * Official primary → test score conversion for EGE physics 2026.
 * Index = primary score; value = test score. 0 → 0.
 */
export const PRIMARY_TO_TEST_SCORE: readonly number[] = [
  0, 5, 9, 14, 18, 23, 27, 32, 36, 39, 41, 43, 44, 46, 48, 49, 51, 53, 54, 56, 58,
  59, 61, 62, 64, 65, 67, 68, 70, 71, 73, 74, 76, 77, 79, 80, 82, 84, 86, 88, 90,
  92, 94, 96, 98, 100,
] as const;

export const QUESTION_RULES: QuestionRule[] = [
  { number: 1, maxScore: 1, type: 'EXACT_1' },
  { number: 2, maxScore: 1, type: 'EXACT_1' },
  { number: 3, maxScore: 1, type: 'EXACT_1' },
  { number: 4, maxScore: 1, type: 'EXACT_1' },
  { number: 5, maxScore: 2, type: 'SET_2' },
  { number: 6, maxScore: 2, type: 'POSITIONAL_2' },
  { number: 7, maxScore: 1, type: 'EXACT_1' },
  { number: 8, maxScore: 1, type: 'EXACT_1' },
  { number: 9, maxScore: 2, type: 'SET_2' },
  { number: 10, maxScore: 2, type: 'POSITIONAL_2' },
  { number: 11, maxScore: 1, type: 'EXACT_1' },
  { number: 12, maxScore: 1, type: 'EXACT_1' },
  { number: 13, maxScore: 1, type: 'EXACT_1' },
  { number: 14, maxScore: 2, type: 'SET_2' },
  { number: 15, maxScore: 2, type: 'POSITIONAL_2' },
  { number: 16, maxScore: 1, type: 'EXACT_1' },
  { number: 17, maxScore: 2, type: 'POSITIONAL_2' },
  { number: 18, maxScore: 2, type: 'SET_2' },
  { number: 19, maxScore: 1, type: 'EXACT_1' },
  { number: 20, maxScore: 1, type: 'EXACT_SET_UNORDERED' },
];

export const QUESTION_TYPE_LABELS: Record<QuestionCheckType, string> = {
  EXACT_1: 'Точный',
  EXACT_SET_UNORDERED: 'Набор',
  POSITIONAL_2: 'Позиции',
  SET_2: 'Выбор',
};

export const MANUAL_QUESTION_RULES: ManualQuestionRule[] = [
  { number: 21, maxScore: 3 },
  { number: 22, maxScore: 2 },
  { number: 23, maxScore: 2 },
  { number: 24, maxScore: 3 },
  { number: 25, maxScore: 3 },
  { number: 26, maxScore: 4 },
];

const rulesByNumber = new Map(
  QUESTION_RULES.map((rule) => [rule.number, rule] as const),
);

const manualRulesByNumber = new Map(
  MANUAL_QUESTION_RULES.map((rule) => [rule.number, rule] as const),
);

export function getQuestionRule(number: number): QuestionRule {
  const rule = rulesByNumber.get(number);
  if (!rule) {
    throw new Error(`Unknown EGE checker question: ${number}`);
  }
  return rule;
}

export function getManualQuestionRule(number: number): ManualQuestionRule {
  const rule = manualRulesByNumber.get(number);
  if (!rule) {
    throw new Error(`Unknown EGE checker manual question: ${number}`);
  }
  return rule;
}

export function createEmptyAnswerMap(): AnswerMap {
  const answers: AnswerMap = {};
  for (const rule of QUESTION_RULES) {
    answers[String(rule.number)] = '';
  }
  return answers;
}

export function createEmptyManualScoreMap(): ManualScoreMap {
  const scores: ManualScoreMap = {};
  for (const rule of MANUAL_QUESTION_RULES) {
    scores[String(rule.number)] = 0;
  }
  return scores;
}

export function getTestScore(primaryScore: number): number {
  if (!Number.isFinite(primaryScore) || primaryScore <= 0) {
    return 0;
  }

  const clamped = Math.min(
    EXAM_PRIMARY_MAX_SCORE,
    Math.max(0, Math.floor(primaryScore)),
  );
  return PRIMARY_TO_TEST_SCORE[clamped] ?? 0;
}

export function getNextQuestionNumber(current: number): number | null {
  if (current < 1 || current >= QUESTION_COUNT) {
    return null;
  }
  return current + 1;
}

export function getPreviousQuestionNumber(current: number): number | null {
  if (current <= 1 || current > QUESTION_COUNT) {
    return null;
  }
  return current - 1;
}

export function resolveEnterNavigation(
  current: number,
  shiftKey = false,
): { currentNumber: number; completed: boolean } {
  if (shiftKey) {
    return {
      currentNumber: getPreviousQuestionNumber(current) ?? current,
      completed: false,
    };
  }

  if (current >= QUESTION_COUNT) {
    return {
      currentNumber: QUESTION_COUNT,
      completed: true,
    };
  }

  return {
    currentNumber: getNextQuestionNumber(current) ?? current,
    completed: false,
  };
}
