import type {
  NumericQuestionConfig,
  ShortTextQuestionConfig,
  StudentAnswerValue,
  StudentTestQuestion,
  TestQuestion,
  TestQuestionType,
} from '@/types/tests';

export interface GradedAnswer {
  isCorrect: boolean;
  pointsEarned: number;
}

export interface QuestionSnapshot extends StudentTestQuestion {
  config: TestQuestion['config'];
  correctOptionIds?: string[];
  matchingPairs?: Array<{ leftOptionId: string; rightOptionId: string }>;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function parseNumeric(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function gradeNumericAnswer(
  config: NumericQuestionConfig,
  answer: StudentAnswerValue,
): GradedAnswer {
  if (answer.type !== 'numeric') {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const studentValue = parseNumeric(answer.value);
  if (studentValue === null) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const tolerance = config.tolerance ?? 0;
  const isCorrect = Math.abs(studentValue - config.correctValue) <= tolerance;
  return { isCorrect, pointsEarned: isCorrect ? 1 : 0 };
}

export function gradeShortTextAnswer(
  config: ShortTextQuestionConfig,
  answer: StudentAnswerValue,
): GradedAnswer {
  if (answer.type !== 'short_text') {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const studentValue = normalizeText(answer.value);
  if (!studentValue) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const accepted = config.acceptedAnswers.map((item) =>
    config.caseInsensitive ? normalizeText(item).toLowerCase() : normalizeText(item),
  );
  const comparable = config.caseInsensitive
    ? studentValue.toLowerCase()
    : studentValue;

  const isCorrect = accepted.includes(comparable);
  return { isCorrect, pointsEarned: isCorrect ? 1 : 0 };
}

export function gradeSingleChoiceAnswer(
  correctOptionId: string | undefined,
  answer: StudentAnswerValue,
): GradedAnswer {
  if (answer.type !== 'single_choice' || !correctOptionId) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const isCorrect = answer.optionId === correctOptionId;
  return { isCorrect, pointsEarned: isCorrect ? 1 : 0 };
}

export function gradeMultipleChoiceAnswer(
  correctOptionIds: string[],
  answer: StudentAnswerValue,
): GradedAnswer {
  if (answer.type !== 'multiple_choice') {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const selected = new Set(answer.optionIds);
  const correct = new Set(correctOptionIds);

  if (selected.size !== correct.size) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  for (const optionId of correct) {
    if (!selected.has(optionId)) {
      return { isCorrect: false, pointsEarned: 0 };
    }
  }

  return { isCorrect: true, pointsEarned: 1 };
}

export function gradeMatchingAnswer(
  expectedPairs: Array<{ leftOptionId: string; rightOptionId: string }>,
  answer: StudentAnswerValue,
): GradedAnswer {
  if (answer.type !== 'matching') {
    return { isCorrect: false, pointsEarned: 0 };
  }

  if (answer.pairs.length !== expectedPairs.length) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const expected = new Set(
    expectedPairs.map((pair) => `${pair.leftOptionId}:${pair.rightOptionId}`),
  );

  for (const pair of answer.pairs) {
    if (!expected.has(`${pair.leftOptionId}:${pair.rightOptionId}`)) {
      return { isCorrect: false, pointsEarned: 0 };
    }
  }

  return { isCorrect: true, pointsEarned: 1 };
}

export function gradeAnswer(
  question: QuestionSnapshot,
  answer: StudentAnswerValue | undefined,
  maxPoints: number,
): GradedAnswer {
  if (!answer || answer.type === 'unknown') {
    return { isCorrect: false, pointsEarned: 0 };
  }

  let base: GradedAnswer;

  switch (question.questionType) {
    case 'numeric':
      base = gradeNumericAnswer(question.config as NumericQuestionConfig, answer);
      break;
    case 'short_text':
      base = gradeShortTextAnswer(question.config as ShortTextQuestionConfig, answer);
      break;
    case 'single_choice':
      base = gradeSingleChoiceAnswer(question.correctOptionIds?.[0], answer);
      break;
    case 'multiple_choice':
      base = gradeMultipleChoiceAnswer(question.correctOptionIds ?? [], answer);
      break;
    case 'matching':
      base = gradeMatchingAnswer(question.matchingPairs ?? [], answer);
      break;
    default:
      base = { isCorrect: false, pointsEarned: 0 };
  }

  return {
    isCorrect: base.isCorrect,
    pointsEarned: base.isCorrect ? maxPoints : 0,
  };
}

export function toStudentQuestion(question: TestQuestion): StudentTestQuestion {
  return {
    id: question.id,
    sortOrder: question.sortOrder,
    questionType: question.questionType,
    promptText: question.promptText,
    imageUrl: question.imageUrl,
    maxPoints: question.maxPoints,
    options: question.options.map((option) => ({
      id: option.id,
      sortOrder: option.sortOrder,
      labelText: option.labelText,
      matchKey: option.matchKey,
    })),
  };
}

export function toQuestionSnapshot(question: TestQuestion): QuestionSnapshot {
  const leftOptions = question.options.filter((option) => option.matchKey === 'left');
  const rightOptions = question.options.filter((option) => option.matchKey === 'right');

  const matchingPairs =
    question.questionType === 'matching'
      ? leftOptions.flatMap((left, index) => {
          const right = rightOptions[index];
          if (!right || !left.isCorrect || !right.isCorrect) {
            return [];
          }
          return [{ leftOptionId: left.id, rightOptionId: right.id }];
        })
      : undefined;

  return {
    ...toStudentQuestion(question),
    config: question.config,
    correctOptionIds:
      question.questionType === 'single_choice' ||
      question.questionType === 'multiple_choice'
        ? question.options.filter((option) => option.isCorrect).map((option) => option.id)
        : undefined,
    matchingPairs,
  };
}

export function buildQuestionSnapshots(questions: TestQuestion[]): QuestionSnapshot[] {
  return [...questions]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toQuestionSnapshot);
}

export function computeFinalStats(input: {
  questions: QuestionSnapshot[];
  firstAttemptAnswers: Map<string, { isCorrect: boolean; pointsEarned: number }>;
  secondAttemptAnswers: Map<
    string,
    { isCorrect: boolean; pointsEarned: number; isUnknown: boolean }
  >;
}): {
  firstAttemptCorrect: number;
  firstAttemptTotal: number;
  secondAttemptFixed: number;
  secondAttemptUnknown: number;
  finalScore: number;
  finalMaxScore: number;
  finalPercent: number;
} {
  const firstAttemptTotal = input.questions.length;
  let firstAttemptCorrect = 0;
  let secondAttemptFixed = 0;
  let secondAttemptUnknown = 0;
  let finalScore = 0;
  let finalMaxScore = 0;

  for (const question of input.questions) {
    finalMaxScore += question.maxPoints;
    const first = input.firstAttemptAnswers.get(question.id);

    if (first?.isCorrect) {
      firstAttemptCorrect += 1;
      finalScore += first.pointsEarned;
      continue;
    }

    const second = input.secondAttemptAnswers.get(question.id);
    if (second?.isUnknown) {
      secondAttemptUnknown += 1;
      continue;
    }

    if (second?.isCorrect) {
      secondAttemptFixed += 1;
      finalScore += second.pointsEarned;
    }
  }

  const finalPercent =
    finalMaxScore > 0 ? Math.round((finalScore / finalMaxScore) * 10000) / 100 : 0;

  return {
    firstAttemptCorrect,
    firstAttemptTotal,
    secondAttemptFixed,
    secondAttemptUnknown,
    finalScore,
    finalMaxScore,
    finalPercent,
  };
}

export function validateQuestionInput(
  questionType: TestQuestionType,
  config: TestQuestion['config'],
  options: TestQuestion['options'],
): string | null {
  switch (questionType) {
    case 'numeric': {
      const numeric = config as NumericQuestionConfig;
      if (typeof numeric.correctValue !== 'number' || !Number.isFinite(numeric.correctValue)) {
        return 'Numeric question requires correctValue';
      }
      if (
        numeric.tolerance !== undefined &&
        (typeof numeric.tolerance !== 'number' || numeric.tolerance < 0)
      ) {
        return 'Numeric tolerance must be non-negative';
      }
      return null;
    }
    case 'short_text': {
      const text = config as ShortTextQuestionConfig;
      if (!Array.isArray(text.acceptedAnswers) || text.acceptedAnswers.length === 0) {
        return 'Short text question requires acceptedAnswers';
      }
      return null;
    }
    case 'single_choice': {
      const correctCount = options.filter((option) => option.isCorrect).length;
      if (options.length < 2) return 'Single choice requires at least 2 options';
      if (correctCount !== 1) return 'Single choice requires exactly one correct option';
      return null;
    }
    case 'multiple_choice': {
      const correctCount = options.filter((option) => option.isCorrect).length;
      if (options.length < 2) return 'Multiple choice requires at least 2 options';
      if (correctCount < 1) return 'Multiple choice requires at least one correct option';
      return null;
    }
    case 'matching': {
      const left = options.filter((option) => option.matchKey === 'left');
      const right = options.filter((option) => option.matchKey === 'right');
      if (left.length < 2 || right.length < 2) {
        return 'Matching requires at least 2 pairs';
      }
      if (left.length !== right.length) {
        return 'Matching left and right counts must match';
      }
      return null;
    }
    default:
      return 'Unknown question type';
  }
}

/** Проверка, что student API payload не содержит answer key */
export function assertNoAnswerKeyInStudentPayload(payload: unknown): boolean {
  const json = JSON.stringify(payload);
  const forbidden = [
    '"isCorrect"',
    '"correctValue"',
    '"acceptedAnswers"',
    '"correctOptionIds"',
    '"matchingPairs"',
    '"tolerance"',
    '"question_snapshot"',
    '"config"',
  ];
  return !forbidden.some((needle) => json.includes(needle));
}
