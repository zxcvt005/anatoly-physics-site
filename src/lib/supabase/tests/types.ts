import type {
  LessonTopic,
  LessonTopicSection,
  TestAssignment,
  TestAttemptSummary,
  TestEditorBundle,
  TestQuestion,
  TestSummary,
  TopicTestStats,
} from '@/types/tests';

export type TestsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: 'TEST_IN_USE' | 'TEST_NOT_FOUND' };

export interface LessonTopicSectionRow {
  id: string;
  app_id: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonTopicRow {
  id: string;
  app_id: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  section_id: string | null;
  created_at: string;
  updated_at: string;
  lesson_topic_sections?:
    | { app_id: string; title: string; sort_order: number }
    | { app_id: string; title: string; sort_order: number }[]
    | null;
}

export interface TestRow {
  id: string;
  app_id: string;
  test_type: 'homework' | 'intensive';
  title: string;
  lesson_topic_id: string | null;
  intensive_id: string | null;
  version: number;
  is_active: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestQuestionRow {
  id: string;
  app_id: string;
  test_id: string;
  test_version: number;
  sort_order: number;
  question_type: TestQuestion['questionType'];
  prompt_text: string;
  image_url: string | null;
  max_points: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TestQuestionOptionRow {
  id: string;
  app_id: string;
  question_id: string;
  sort_order: number;
  label_text: string;
  is_correct: boolean;
  match_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestAssignmentRow {
  id: string;
  app_id: string;
  test_id: string;
  student_id: string;
  lesson_id: string | null;
  status: TestAssignment['status'];
  source: TestAssignment['source'];
  created_at: string;
  updated_at: string;
}

export interface TestAttemptRow {
  id: string;
  app_id: string;
  test_id: string;
  test_version: number;
  student_id: string;
  assignment_id: string | null;
  stage: TestAttemptSummary['stage'];
  question_snapshot: unknown;
  first_attempt_correct: number | null;
  first_attempt_total: number | null;
  second_attempt_fixed: number | null;
  second_attempt_unknown: number | null;
  final_score: number | null;
  final_max_score: number | null;
  final_percent: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestAttemptAnswerRow {
  id: string;
  attempt_id: string;
  question_id: string;
  attempt_number: number;
  answer: unknown;
  is_correct: boolean | null;
  is_unknown: boolean;
  points_earned: number | null;
  first_attempt_was_wrong: boolean | null;
  created_at: string;
  updated_at: string;
}

export type TopicsList = LessonTopic[];
export type TestBundle = TestEditorBundle;
export type TopicStats = TopicTestStats;
