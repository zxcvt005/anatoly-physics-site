import 'server-only';

import {
  formatCorrectAnswerDisplay,
} from '@/lib/tests/attempt-review';
import type { QuestionSnapshot } from '@/lib/tests/grading';
import {
  averageCompletedPercents,
  buildQuestionStatsFromOutcomes,
  classifyAttemptQuestionOutcome,
  sortQuestionStats,
  sortTestStatsByRecency,
  type CrmTestQuestionStats,
  type CrmTestStatsDetail,
  type CrmTestStatsListItem,
} from '@/lib/tests/crm-test-stats';
import { findQuestionAppIdByStorageUuid } from '@/lib/tests/question-storage-id';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import type { StudentAnswerValue } from '@/types/tests';

type GradesRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

function fail(error: string, status = 400): GradesRepositoryResult<never> {
  return { ok: false, error, status };
}

function getClient() {
  return createSupabaseAdminClient();
}

type RelationOne<T> = T | T[] | null | undefined;

function asOne<T>(value: RelationOne<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseSnapshot(value: unknown): QuestionSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value as QuestionSnapshot[];
}

export async function fetchCrmTestStatsListFromSupabase(): Promise<
  GradesRepositoryResult<{ tests: CrmTestStatsListItem[] }>
> {
  if (!isSupabaseConfiguredOnServer()) {
    return fail('Supabase is not configured', 503);
  }

  const client = getClient();
  const { data, error } = await client
    .from('test_attempts')
    .select(
      `
      app_id,
      completed_at,
      final_percent,
      stage,
      tests!inner (
        app_id,
        test_type,
        title,
        lesson_topics (
          app_id,
          title,
          lesson_topic_sections ( title )
        )
      )
    `,
    )
    .eq('stage', 'completed')
    .eq('tests.test_type', 'homework');

  if (error) return fail(error.message);

  type Row = {
    completed_at: string | null;
    final_percent: number | string | null;
    tests: RelationOne<{
      app_id: string;
      test_type: string;
      title: string;
      lesson_topics: RelationOne<{
        app_id: string;
        title: string;
        lesson_topic_sections: RelationOne<{ title: string }>;
      }>;
    }>;
  };

  const byTest = new Map<
    string,
    {
      title: string;
      sectionTitle?: string;
      topicTitle?: string;
      percents: number[];
      latestCompletedAt?: string;
    }
  >();

  for (const row of (data ?? []) as unknown as Row[]) {
    const test = asOne(row.tests);
    if (!test || test.test_type !== 'homework') continue;
    if (row.final_percent === null || row.final_percent === undefined) continue;

    const topic = asOne(test.lesson_topics);
    const section = topic ? asOne(topic.lesson_topic_sections) : null;
    const title = topic?.title?.trim() || test.title.trim() || 'Домашнее задание';

    let entry = byTest.get(test.app_id);
    if (!entry) {
      entry = {
        title,
        topicTitle: topic?.title,
        sectionTitle: section?.title,
        percents: [],
      };
      byTest.set(test.app_id, entry);
    }

    entry.percents.push(Number(row.final_percent));

    if (row.completed_at) {
      const current = entry.latestCompletedAt
        ? new Date(entry.latestCompletedAt).getTime()
        : 0;
      const next = new Date(row.completed_at).getTime();
      if (next >= current) {
        entry.latestCompletedAt = row.completed_at;
      }
    }
  }

  const tests = sortTestStatsByRecency(
    [...byTest.entries()].map(([testId, entry]) => ({
      testId,
      title: entry.title,
      topicTitle: entry.topicTitle,
      sectionTitle: entry.sectionTitle,
      completedCount: entry.percents.length,
      avgPercent: averageCompletedPercents(entry.percents),
      latestCompletedAt: entry.latestCompletedAt,
    })),
  );

  return { ok: true, data: { tests } };
}

export async function fetchCrmTestStatsDetailFromSupabase(
  testAppId: string,
): Promise<GradesRepositoryResult<CrmTestStatsDetail>> {
  if (!isSupabaseConfiguredOnServer()) {
    return fail('Supabase is not configured', 503);
  }

  const client = getClient();
  const { data: testRow, error: testError } = await client
    .from('tests')
    .select(
      `
      id,
      app_id,
      title,
      test_type,
      lesson_topics (
        title,
        lesson_topic_sections ( title )
      )
    `,
    )
    .eq('app_id', testAppId)
    .maybeSingle();

  if (testError) return fail(testError.message);
  if (!testRow) return fail('Test not found', 404);

  const test = testRow as {
    id: string;
    app_id: string;
    title: string;
    test_type: string;
    lesson_topics: RelationOne<{
      title: string;
      lesson_topic_sections: RelationOne<{ title: string }>;
    }>;
  };

  if (test.test_type !== 'homework') {
    return fail('Test not found', 404);
  }

  const topic = asOne(test.lesson_topics);
  const section = topic ? asOne(topic.lesson_topic_sections) : null;
  const title = topic?.title?.trim() || test.title.trim() || 'Домашнее задание';

  const { data: attemptRows, error: attemptsError } = await client
    .from('test_attempts')
    .select(
      'id, app_id, completed_at, final_percent, question_snapshot, stage',
    )
    .eq('test_id', test.id)
    .eq('stage', 'completed');

  if (attemptsError) return fail(attemptsError.message);

  type AttemptRow = {
    id: string;
    app_id: string;
    completed_at: string | null;
    final_percent: number | string | null;
    question_snapshot: unknown;
  };

  const completed = (attemptRows ?? []) as AttemptRow[];
  const percents = completed
    .map((row) =>
      row.final_percent === null || row.final_percent === undefined
        ? null
        : Number(row.final_percent),
    )
    .filter((value): value is number => value !== null);

  if (completed.length === 0) {
    return {
      ok: true,
      data: {
        testId: test.app_id,
        title,
        topicTitle: topic?.title,
        sectionTitle: section?.title,
        completedCount: 0,
        avgPercent: null,
        questions: [],
      },
    };
  }

  const attemptUuids = completed.map((row) => row.id);
  const { data: answerRows, error: answersError } = await client
    .from('test_attempt_answers')
    .select('attempt_id, question_id, attempt_number, is_correct, is_unknown, answer')
    .in('attempt_id', attemptUuids);

  if (answersError) return fail(answersError.message);

  type AnswerRow = {
    attempt_id: string;
    question_id: string;
    attempt_number: number;
    is_correct: boolean | null;
    is_unknown: boolean;
    answer: StudentAnswerValue | null;
  };

  const answersByAttempt = new Map<string, AnswerRow[]>();
  for (const row of (answerRows ?? []) as AnswerRow[]) {
    const list = answersByAttempt.get(row.attempt_id) ?? [];
    list.push(row);
    answersByAttempt.set(row.attempt_id, list);
  }

  const questionMeta = new Map<
    string,
    {
      sortOrder: number;
      promptText: string;
      imageUrl?: string;
      questionType: QuestionSnapshot['questionType'];
      correctAnswerDisplay: string;
      outcomes: Array<'correct' | 'incorrect' | 'skipped'>;
    }
  >();

  for (const attempt of completed) {
    const snapshots = parseSnapshot(attempt.question_snapshot);
    const answers = answersByAttempt.get(attempt.id) ?? [];

    const firstByAppId = new Map<string, AnswerRow>();
    const secondByAppId = new Map<string, AnswerRow>();

    for (const row of answers) {
      const appId = findQuestionAppIdByStorageUuid(snapshots, row.question_id);
      if (!appId) continue;
      if (row.attempt_number === 1) firstByAppId.set(appId, row);
      if (row.attempt_number === 2) secondByAppId.set(appId, row);
    }

    for (const question of snapshots) {
      const firstRow = firstByAppId.get(question.id);
      const secondRow = secondByAppId.get(question.id);
      const outcome = classifyAttemptQuestionOutcome({
        firstCorrect: firstRow?.is_correct === true,
        secondRow: secondRow
          ? {
              is_correct: secondRow.is_correct,
              is_unknown: secondRow.is_unknown,
            }
          : undefined,
      });

      const existing = questionMeta.get(question.id);
      if (!existing) {
        questionMeta.set(question.id, {
          sortOrder: question.sortOrder,
          promptText: question.promptText.trim() || `Задание ${question.sortOrder + 1}`,
          imageUrl: question.imageUrl,
          questionType: question.questionType,
          correctAnswerDisplay: formatCorrectAnswerDisplay(question),
          outcomes: [outcome],
        });
      } else {
        existing.outcomes.push(outcome);
        if (question.sortOrder < existing.sortOrder) {
          existing.sortOrder = question.sortOrder;
        }
        if (question.promptText.trim()) {
          existing.promptText = question.promptText.trim();
        }
        if (question.imageUrl) {
          existing.imageUrl = question.imageUrl;
        }
        existing.correctAnswerDisplay = formatCorrectAnswerDisplay(question);
      }
    }
  }

  const questions: CrmTestQuestionStats[] = sortQuestionStats(
    [...questionMeta.entries()].map(([questionId, meta]) =>
      buildQuestionStatsFromOutcomes({
        questionId,
        sortOrder: meta.sortOrder,
        promptText: meta.promptText,
        imageUrl: meta.imageUrl,
        questionType: meta.questionType,
        correctAnswerDisplay: meta.correctAnswerDisplay,
        outcomes: meta.outcomes,
      }),
    ),
    'difficulty',
  );

  return {
    ok: true,
    data: {
      testId: test.app_id,
      title,
      topicTitle: topic?.title,
      sectionTitle: section?.title,
      completedCount: completed.length,
      avgPercent: averageCompletedPercents(percents),
      questions,
    },
  };
}
