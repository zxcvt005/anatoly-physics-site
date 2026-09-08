import { resolveFinalQuestionOutcome } from '@/lib/tests/attempt-review';
import type { TestQuestionType } from '@/types/tests';

export interface CrmTestStatsListItem {
  testId: string;
  title: string;
  sectionTitle?: string;
  topicTitle?: string;
  completedCount: number;
  avgPercent: number | null;
  latestCompletedAt?: string;
}

export interface CrmTestQuestionStats {
  questionId: string;
  number: number;
  sortOrder: number;
  promptText: string;
  imageUrl?: string;
  questionType: TestQuestionType;
  correctAnswerDisplay: string;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  correctPercent: number;
}

export interface CrmTestStatsDetail {
  testId: string;
  title: string;
  sectionTitle?: string;
  topicTitle?: string;
  completedCount: number;
  avgPercent: number | null;
  questions: CrmTestQuestionStats[];
}

export type CrmTestQuestionSortId = 'difficulty' | 'order';

export function averageCompletedPercents(
  percents: number[],
): number | null {
  if (percents.length === 0) return null;
  const sum = percents.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / percents.length) * 100) / 100;
}

export function classifyAttemptQuestionOutcome(input: {
  firstCorrect: boolean;
  secondRow?: {
    is_correct: boolean | null;
    is_unknown: boolean;
  };
}): 'correct' | 'incorrect' | 'skipped' {
  return resolveFinalQuestionOutcome(input);
}

export function buildQuestionStatsFromOutcomes(input: {
  questionId: string;
  sortOrder: number;
  promptText: string;
  imageUrl?: string;
  questionType: TestQuestionType;
  correctAnswerDisplay: string;
  outcomes: Array<'correct' | 'incorrect' | 'skipped'>;
}): CrmTestQuestionStats {
  const attempted = input.outcomes.length;
  const correct = input.outcomes.filter((item) => item === 'correct').length;
  const incorrect = input.outcomes.filter((item) => item === 'incorrect').length;
  const skipped = input.outcomes.filter((item) => item === 'skipped').length;
  const correctPercent =
    attempted > 0 ? Math.round((correct / attempted) * 10000) / 100 : 0;

  return {
    questionId: input.questionId,
    number: input.sortOrder + 1,
    sortOrder: input.sortOrder,
    promptText: input.promptText,
    imageUrl: input.imageUrl,
    questionType: input.questionType,
    correctAnswerDisplay: input.correctAnswerDisplay,
    attempted,
    correct,
    incorrect,
    skipped,
    correctPercent,
  };
}

export function sortQuestionStats(
  questions: CrmTestQuestionStats[],
  sortId: CrmTestQuestionSortId,
): CrmTestQuestionStats[] {
  const copy = [...questions];
  if (sortId === 'order') {
    copy.sort((a, b) => a.sortOrder - b.sortOrder);
    return copy;
  }

  copy.sort((a, b) => {
    if (a.correctPercent !== b.correctPercent) {
      return a.correctPercent - b.correctPercent;
    }
    return a.sortOrder - b.sortOrder;
  });
  return copy;
}

export function matchesTestStatsSearch(
  item: Pick<CrmTestStatsListItem, 'title' | 'topicTitle' | 'sectionTitle'>,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [item.title, item.topicTitle ?? '', item.sectionTitle ?? '']
    .join(' ')
    .toLowerCase();
  return haystack.includes(normalized);
}

export function sortTestStatsByRecency(
  items: CrmTestStatsListItem[],
): CrmTestStatsListItem[] {
  return [...items].sort((a, b) => {
    const dateA = a.latestCompletedAt
      ? new Date(a.latestCompletedAt).getTime()
      : 0;
    const dateB = b.latestCompletedAt
      ? new Date(b.latestCompletedAt).getTime()
      : 0;
    if (dateB !== dateA) return dateB - dateA;
    return a.title.localeCompare(b.title, 'ru');
  });
}
