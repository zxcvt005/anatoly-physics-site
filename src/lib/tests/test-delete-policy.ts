export const HOMEWORK_TEST_DELETE_STEPS = [
  'test_attempt_answers',
  'test_attempts',
  'test_assignments',
  'test_question_options',
  'test_questions',
  'tests',
  'lessons_topic_cleanup',
  'lesson_topics',
] as const;

export const LESSON_TOPIC_CLEANUP_FIELDS = [
  'lesson_topic_id',
  'homework_points_earned',
  'homework_points_max',
  'homework_percent',
] as const;

export interface HomeworkTestDeleteResult {
  topicId: string;
  deletedTopic: true;
}

export function buildLessonTopicCleanupUpdate(): Record<
  (typeof LESSON_TOPIC_CLEANUP_FIELDS)[number],
  null
> {
  return {
    lesson_topic_id: null,
    homework_points_earned: null,
    homework_points_max: null,
    homework_percent: null,
  };
}
