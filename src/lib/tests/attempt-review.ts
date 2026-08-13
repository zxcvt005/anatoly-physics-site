import type { QuestionSnapshot } from '@/lib/tests/grading';
import type {
  NumericQuestionConfig,
  ShortTextQuestionConfig,
  StudentAnswerValue,
  TestQuestionType,
} from '@/types/tests';

export type AttemptReviewResultStatus =
  | 'correct_first'
  | 'corrected_second'
  | 'incorrect_final'
  | 'unknown';

export interface CompletedAttemptReviewQuestion {
  questionId: string;
  sortOrder: number;
  promptText: string;
  imageUrl?: string;
  questionType: TestQuestionType;
  correctAnswerDisplay: string;
  firstAttemptAnswerDisplay: string;
  secondAttemptAnswerDisplay?: string;
  resultStatus: AttemptReviewResultStatus;
  resultLabel: string;
}

export interface CompletedAttemptReview {
  attemptId: string;
  testId: string;
  title: string;
  firstAttemptCorrect: number;
  firstAttemptTotal: number;
  secondAttemptFixed: number;
  secondAttemptUnknown: number;
  finalScore: number;
  finalMaxScore: number;
  finalPercent: number;
  questions: CompletedAttemptReviewQuestion[];
}

export const REVIEW_STATUS_LABELS: Record<AttemptReviewResultStatus, string> = {
  correct_first: 'Верно с первой попытки',
  corrected_second: 'Исправлено со второй попытки',
  incorrect_final: 'Не решено',
  unknown: 'Не решено',
};

interface AnswerRowLike {
  question_id: string;
  attempt_number: number;
  answer: StudentAnswerValue | null;
  is_correct: boolean | null;
  is_unknown: boolean;
}

export function formatCorrectAnswerDisplay(question: QuestionSnapshot): string {
  switch (question.questionType) {
    case 'numeric': {
      const config = question.config as NumericQuestionConfig;
      const tolerance =
        config.tolerance !== undefined && config.tolerance > 0
          ? ` (±${config.tolerance})`
          : '';
      return `${config.correctValue}${tolerance}`;
    }
    case 'short_text': {
      const config = question.config as ShortTextQuestionConfig;
      return config.acceptedAnswers.join(', ');
    }
    case 'single_choice': {
      const correctId = question.correctOptionIds?.[0];
      const option = question.options.find((item) => item.id === correctId);
      return option?.labelText ?? '—';
    }
    case 'multiple_choice': {
      const labels = question.options
        .filter((item) => question.correctOptionIds?.includes(item.id))
        .map((item) => item.labelText);
      return labels.length > 0 ? labels.join('; ') : '—';
    }
    case 'matching': {
      const pairs = question.matchingPairs ?? [];
      return pairs
        .map((pair) => {
          const left = question.options.find((item) => item.id === pair.leftOptionId);
          const right = question.options.find((item) => item.id === pair.rightOptionId);
          return `${left?.labelText ?? '?'} → ${right?.labelText ?? '?'}`;
        })
        .join('; ');
    }
    default:
      return '—';
  }
}

export function formatStudentAnswerDisplay(
  question: QuestionSnapshot,
  answer: StudentAnswerValue | null | undefined,
): string {
  if (!answer || answer.type === 'unknown') {
    return 'Не знаю';
  }

  switch (answer.type) {
    case 'numeric':
      return answer.value.trim() || '—';
    case 'short_text':
      return answer.value.trim() || '—';
    case 'single_choice': {
      const option = question.options.find((item) => item.id === answer.optionId);
      return option?.labelText ?? '—';
    }
    case 'multiple_choice': {
      const labels = question.options
        .filter((item) => answer.optionIds.includes(item.id))
        .map((item) => item.labelText);
      return labels.length > 0 ? labels.join('; ') : '—';
    }
    case 'matching':
      return answer.pairs
        .map((pair) => {
          const left = question.options.find((item) => item.id === pair.leftOptionId);
          const right = question.options.find((item) => item.id === pair.rightOptionId);
          return `${left?.labelText ?? '?'} → ${right?.labelText ?? '?'}`;
        })
        .join('; ');
    default:
      return '—';
  }
}

function resolveResultStatus(input: {
  firstCorrect: boolean;
  secondRow?: AnswerRowLike;
}): AttemptReviewResultStatus {
  if (input.firstCorrect) return 'correct_first';

  if (!input.secondRow) return 'incorrect_final';
  if (input.secondRow.is_unknown) return 'unknown';
  if (input.secondRow.is_correct) return 'corrected_second';
  return 'incorrect_final';
}

export function buildCompletedAttemptReview(input: {
  attemptAppId: string;
  testAppId: string;
  title: string;
  snapshots: QuestionSnapshot[];
  answerRows: AnswerRowLike[];
  stats: {
    firstAttemptCorrect: number;
    firstAttemptTotal: number;
    secondAttemptFixed: number;
    secondAttemptUnknown: number;
    finalScore: number;
    finalMaxScore: number;
    finalPercent: number;
  };
  resolveQuestionAppId: (storageUuid: string) => string | undefined;
}): CompletedAttemptReview {
  const firstByAppId = new Map<string, AnswerRowLike>();
  const secondByAppId = new Map<string, AnswerRowLike>();

  for (const row of input.answerRows) {
    const appId = input.resolveQuestionAppId(row.question_id);
    if (!appId) continue;
    if (row.attempt_number === 1) firstByAppId.set(appId, row);
    if (row.attempt_number === 2) secondByAppId.set(appId, row);
  }

  const questions = [...input.snapshots]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((question, index) => {
      const firstRow = firstByAppId.get(question.id);
      const secondRow = secondByAppId.get(question.id);
      const firstCorrect = firstRow?.is_correct === true;
      const resultStatus = resolveResultStatus({ firstCorrect, secondRow });

      return {
        questionId: question.id,
        sortOrder: question.sortOrder,
        promptText: question.promptText.trim() || `Задание ${index + 1}`,
        imageUrl: question.imageUrl,
        questionType: question.questionType,
        correctAnswerDisplay: formatCorrectAnswerDisplay(question),
        firstAttemptAnswerDisplay: formatStudentAnswerDisplay(
          question,
          firstRow?.answer as StudentAnswerValue | null,
        ),
        secondAttemptAnswerDisplay: secondRow
          ? formatStudentAnswerDisplay(question, secondRow.answer as StudentAnswerValue | null)
          : undefined,
        resultStatus,
        resultLabel: REVIEW_STATUS_LABELS[resultStatus],
      };
    });

  return {
    attemptId: input.attemptAppId,
    testId: input.testAppId,
    title: input.title,
    ...input.stats,
    questions,
  };
}
