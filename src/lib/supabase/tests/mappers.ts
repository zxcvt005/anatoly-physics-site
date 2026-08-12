import type {
  LessonTopic,
  TestAssignment,
  TestAttemptSummary,
  TestQuestion,
  TestQuestionOption,
  TestSummary,
} from '@/types/tests';
import type {
  LessonTopicRow,
  TestAssignmentRow,
  TestAttemptRow,
  TestQuestionOptionRow,
  TestQuestionRow,
  TestRow,
} from './types';

export function mapLessonTopicRow(row: LessonTopicRow): LessonTopic {
  return {
    id: row.app_id,
    title: row.title,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export function mapTestSummaryRow(
  row: TestRow,
  questionCount: number,
  maxPoints: number,
): TestSummary {
  return {
    id: row.app_id,
    testType: row.test_type,
    title: row.title,
    lessonTopicId: undefined,
    intensiveId: undefined,
    version: row.version,
    isActive: row.is_active,
    isPublished: row.is_published,
    questionCount,
    maxPoints,
  };
}

export function mapTestQuestionOptionRow(row: TestQuestionOptionRow): TestQuestionOption {
  return {
    id: row.app_id,
    sortOrder: row.sort_order,
    labelText: row.label_text,
    isCorrect: row.is_correct,
    matchKey: row.match_key ?? undefined,
  };
}

export function mapTestQuestionRow(
  row: TestQuestionRow,
  options: TestQuestionOptionRow[],
): TestQuestion {
  return {
    id: row.app_id,
    sortOrder: row.sort_order,
    questionType: row.question_type,
    promptText: row.prompt_text,
    imageUrl: row.image_url ?? undefined,
    maxPoints: Number(row.max_points),
    config: (row.config ?? {}) as TestQuestion['config'],
    options: options
      .filter((option) => option.question_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapTestQuestionOptionRow),
  };
}

export function mapTestAssignmentRow(
  row: TestAssignmentRow,
  testAppId: string,
  studentAppId: string,
  lessonAppId?: string,
): TestAssignment {
  return {
    id: row.app_id,
    testId: testAppId,
    studentId: studentAppId,
    lessonId: lessonAppId,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
  };
}

export function mapTestAttemptRow(
  row: TestAttemptRow,
  testAppId: string,
  studentAppId: string,
  assignmentAppId?: string,
): TestAttemptSummary {
  return {
    id: row.app_id,
    testId: testAppId,
    testVersion: row.test_version,
    studentId: studentAppId,
    assignmentId: assignmentAppId,
    stage: row.stage,
    firstAttemptCorrect: row.first_attempt_correct ?? undefined,
    firstAttemptTotal: row.first_attempt_total ?? undefined,
    secondAttemptFixed: row.second_attempt_fixed ?? undefined,
    secondAttemptUnknown: row.second_attempt_unknown ?? undefined,
    finalScore: row.final_score !== null ? Number(row.final_score) : undefined,
    finalMaxScore:
      row.final_max_score !== null ? Number(row.final_max_score) : undefined,
    finalPercent: row.final_percent !== null ? Number(row.final_percent) : undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function lessonTopicToInsertRow(topic: LessonTopic) {
  return {
    app_id: topic.id,
    title: topic.title,
    sort_order: topic.sortOrder,
    is_active: topic.isActive,
  };
}

export function extractAppId(
  relation: { app_id: string } | { app_id: string }[] | null | undefined,
): string | undefined {
  if (!relation) return undefined;
  if (Array.isArray(relation)) return relation[0]?.app_id;
  return relation.app_id;
}
