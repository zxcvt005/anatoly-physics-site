/** Tables removed explicitly before `students` (RESTRICT FKs). */
export const STUDENT_HARD_DELETE_EXPLICIT_STEPS = [
  'payments',
  'lessons',
] as const;

/**
 * Tables cleaned automatically when `students` row is deleted (DB ON DELETE rules).
 * Documented for audits — not deleted from application code.
 */
export const STUDENT_HARD_DELETE_CASCADE_STEPS = [
  'schedule_slot_students',
  'student_intensive_progress',
  'mock_exam_results',
  'expenses',
  'legal_consents',
  'test_assignments',
  'test_attempts',
  'test_attempt_answers',
  'meme_image_votes',
  'meme_rating_round_items',
  'meme_rating_rounds',
  'meme_images',
] as const;

/** Nullable FK — `trial_lessons.linked_student_id` becomes NULL. */
export const STUDENT_HARD_DELETE_SET_NULL_STEPS = ['trial_lessons'] as const;

export type StudentHardDeleteStep =
  | (typeof STUDENT_HARD_DELETE_EXPLICIT_STEPS)[number]
  | 'students';
