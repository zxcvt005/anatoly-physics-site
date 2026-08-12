import type { Lesson } from '@/types/tutor';

export interface LessonRow {
  id: string;
  app_id: string;
  student_id: string;
  lesson_at: string;
  end_time: string | null;
  status: Lesson['status'];
  payment_status: Lesson['paymentStatus'];
  lesson_type: Lesson['lessonType'];
  is_outside_schedule: boolean;
  makeup_for_lesson_id: string | null;
  makeup_status: NonNullable<Lesson['makeupStatus']>;
  is_chargeable: boolean | null;
  topic: string | null;
  lesson_topic_id: string | null;
  attendance: Lesson['attendance'] | null;
  homework_status: Lesson['homeworkStatus'] | null;
  homework_score: number | null;
  homework_points_earned: number | null;
  homework_points_max: number | null;
  homework_percent: number | null;
  comment: string | null;
  transferred_to_lesson_id: string | null;
  transferred_from_lesson_id: string | null;
  transfer_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonWithStudentRow extends LessonRow {
  students:
    | { app_id: string }
    | { app_id: string }[]
    | null;
  lesson_topics?:
    | { app_id: string; title: string }
    | { app_id: string; title: string }[]
    | null;
}

export type LessonsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type LessonsList = Lesson[];
