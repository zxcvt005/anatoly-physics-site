import {
  EXAM_PRIMARY_MAX_SCORE,
  EXAM_TEST_MAX_SCORE,
  FIRST_PART_MAX_SCORE,
  MANUAL_QUESTION_RULES,
  QUESTION_RULES,
  SECOND_PART_MAX_SCORE,
  TOTAL_MAX_SCORE,
  createEmptyManualScoreMap,
  getManualQuestionRule,
  getQuestionRule,
  getTestScore,
} from '@/lib/tools/ege-checker/constants';
import type {
  AnswerMap,
  ExamScoreResult,
  ManualScoreMap,
  QuestionRule,
  QuestionScoreResult,
  TotalScoreResult,
} from '@/lib/tools/ege-checker/types';

export function normalizeAnswer(value: string): string {
  return value.trim();
}

function countChars(value: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const char of value) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  return counts;
}

export function diffMultisets(
  answer: string,
  reference: string,
): { extra: number; missing: number } {
  const answerCounts = countChars(answer);
  const referenceCounts = countChars(reference);
  const keys = new Set([...answerCounts.keys(), ...referenceCounts.keys()]);
  let extra = 0;
  let missing = 0;

  for (const key of keys) {
    const answerCount = answerCounts.get(key) ?? 0;
    const referenceCount = referenceCounts.get(key) ?? 0;
    if (answerCount > referenceCount) {
      extra += answerCount - referenceCount;
    }
    if (referenceCount > answerCount) {
      missing += referenceCount - answerCount;
    }
  }

  return { extra, missing };
}

export function compareExact(answer: string, reference: string): 0 | 1 {
  return normalizeAnswer(answer) === normalizeAnswer(reference) ? 1 : 0;
}

export function compareUnordered(answer: string, reference: string): 0 | 1 {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedReference = normalizeAnswer(reference);
  const { extra, missing } = diffMultisets(normalizedAnswer, normalizedReference);
  return extra === 0 && missing === 0 ? 1 : 0;
}

export function comparePositional(answer: string, reference: string): 0 | 1 | 2 {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedReference = normalizeAnswer(reference);

  if (normalizedAnswer.length > normalizedReference.length) {
    return 0;
  }

  if (normalizedAnswer === normalizedReference) {
    return 2;
  }

  let mismatches = 0;
  for (let index = 0; index < normalizedReference.length; index += 1) {
    if (normalizedAnswer[index] !== normalizedReference[index]) {
      mismatches += 1;
    }
  }

  return mismatches === 1 ? 1 : 0;
}

export function compareUnorderedPartial(
  answer: string,
  reference: string,
): 0 | 1 | 2 {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedReference = normalizeAnswer(reference);
  const { extra, missing } = diffMultisets(normalizedAnswer, normalizedReference);
  const distance = Math.max(extra, missing);

  if (distance === 0) {
    return 2;
  }

  if (distance === 1) {
    return 1;
  }

  return 0;
}

function toStatus(score: number, maxScore: number): QuestionScoreResult['status'] {
  if (score === maxScore) {
    return 'correct';
  }
  if (score > 0) {
    return 'partial';
  }
  return 'incorrect';
}

export function calculateQuestionScore(
  rule: QuestionRule,
  answer: string,
  reference: string,
): QuestionScoreResult {
  const normalizedReference = normalizeAnswer(reference);

  if (!normalizedReference) {
    return {
      number: rule.number,
      score: 0,
      maxScore: rule.maxScore,
      status: 'missing-reference',
    };
  }

  let score = 0;

  switch (rule.type) {
    case 'EXACT_1':
      score = compareExact(answer, normalizedReference);
      break;
    case 'EXACT_SET_UNORDERED':
      score = compareUnordered(answer, normalizedReference);
      break;
    case 'POSITIONAL_2':
      score = comparePositional(answer, normalizedReference);
      break;
    case 'SET_2':
      score = compareUnorderedPartial(answer, normalizedReference);
      break;
  }

  return {
    number: rule.number,
    score,
    maxScore: rule.maxScore,
    status: toStatus(score, rule.maxScore),
  };
}

export function getMissingReferenceNumbers(references: AnswerMap): number[] {
  return QUESTION_RULES.filter(
    (rule) => !normalizeAnswer(references[String(rule.number)] ?? ''),
  ).map((rule) => rule.number);
}

export function areReferencesComplete(references: AnswerMap): boolean {
  return getMissingReferenceNumbers(references).length === 0;
}

export function hasAnyStudentAnswers(answers: AnswerMap): boolean {
  return QUESTION_RULES.some(
    (rule) => normalizeAnswer(answers[String(rule.number)] ?? '') !== '',
  );
}

export function clampManualScore(number: number, score: number): number {
  const rule = getManualQuestionRule(number);
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(rule.maxScore, Math.floor(score)));
}

export function sanitizeManualScores(scores: ManualScoreMap): ManualScoreMap {
  const next = createEmptyManualScoreMap();
  for (const rule of MANUAL_QUESTION_RULES) {
    const key = String(rule.number);
    next[key] = clampManualScore(rule.number, scores[key] ?? 0);
  }
  return next;
}

export function calculateSecondPartScore(scores: ManualScoreMap): number {
  const sanitized = sanitizeManualScores(scores);
  return MANUAL_QUESTION_RULES.reduce(
    (sum, rule) => sum + (sanitized[String(rule.number)] ?? 0),
    0,
  );
}

export function hasAnyManualScores(scores: ManualScoreMap): boolean {
  return MANUAL_QUESTION_RULES.some(
    (rule) => clampManualScore(rule.number, scores[String(rule.number)] ?? 0) > 0,
  );
}

export function calculateTotalScore(
  answers: AnswerMap,
  references: AnswerMap,
): TotalScoreResult {
  const questions = QUESTION_RULES.map((rule) =>
    calculateQuestionScore(
      rule,
      answers[String(rule.number)] ?? '',
      references[String(rule.number)] ?? '',
    ),
  );

  return {
    earned: questions.reduce((sum, question) => sum + question.score, 0),
    max: TOTAL_MAX_SCORE,
    correct: questions.filter((question) => question.status === 'correct').length,
    partial: questions.filter((question) => question.status === 'partial').length,
    incorrect: questions.filter(
      (question) =>
        question.status === 'incorrect' || question.status === 'missing-reference',
    ).length,
    missingReferences: questions
      .filter((question) => question.status === 'missing-reference')
      .map((question) => question.number),
    questions,
  };
}

export function calculateExamScore(
  answers: AnswerMap,
  references: AnswerMap,
  manualScores: ManualScoreMap = createEmptyManualScoreMap(),
): ExamScoreResult {
  const firstPart = calculateTotalScore(answers, references);
  const sanitizedManual = sanitizeManualScores(manualScores);
  const secondPartScore = calculateSecondPartScore(sanitizedManual);
  const primaryScore = firstPart.earned + secondPartScore;

  return {
    firstPart,
    firstPartScore: firstPart.earned,
    firstPartMax: FIRST_PART_MAX_SCORE,
    secondPartScore,
    secondPartMax: SECOND_PART_MAX_SCORE,
    primaryScore,
    primaryMax: EXAM_PRIMARY_MAX_SCORE,
    testScore: getTestScore(primaryScore),
    testMax: EXAM_TEST_MAX_SCORE,
    manualScores: sanitizedManual,
  };
}

export function calculateQuestionScoreByNumber(
  number: number,
  answer: string,
  reference: string,
): QuestionScoreResult {
  return calculateQuestionScore(getQuestionRule(number), answer, reference);
}

export function formatScoreMark(score: number, maxScore: number): string {
  if (score === maxScore) {
    return '✓';
  }
  if (score > 0) {
    return '~';
  }
  return '×';
}

export function formatScoreFraction(score: number, maxScore: number): string {
  return `${score}/${maxScore}`;
}

export function formatScoreStatusLabel(
  status: QuestionScoreResult['status'],
): string {
  if (status === 'correct') {
    return 'Правильно';
  }
  if (status === 'partial') {
    return 'Частично';
  }
  if (status === 'missing-reference') {
    return 'Нет эталона';
  }
  return 'Неверно';
}
