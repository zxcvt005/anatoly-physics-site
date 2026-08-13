-- =============================================================================
-- Ручная полная очистка КОНТЕНТА системы Tests (без DROP TABLE)
-- Запускать в Supabase SQL Editor вручную. Не применять автоматически.
-- =============================================================================
--
-- Будет удалено:
--   • все test_attempt_answers, test_attempts, test_assignments
--   • все test_question_options, test_questions, tests
--   • все lesson_topics, lesson_topic_sections
--
-- Будет очищено на lessons (сами уроки остаются):
--   • lesson_topic_id, homework_points_earned/max/percent
--
-- НЕ трогается:
--   • lessons (строки), students, schedule, payments, attendance
--   • intensives, student_intensive_progress (legacy matrix)
--   • homework_status, homework_score (legacy)
--   • legal_consents и прочие CRM-таблицы
-- =============================================================================

BEGIN;

-- 1. Ответы попыток (на случай если attempts удалятся не каскадом в вашей схеме)
DELETE FROM public.test_attempt_answers;

-- 2. Попытки
DELETE FROM public.test_attempts;

-- 3. Назначения ДЗ
DELETE FROM public.test_assignments;

-- 4. Варианты ответов (CASCADE от questions, но явно для ясности порядка)
DELETE FROM public.test_question_options;

-- 5. Вопросы тестов
DELETE FROM public.test_questions;

-- 6. Тесты
DELETE FROM public.tests;

-- 7. Темы и разделы Tests UI
DELETE FROM public.lesson_topics;
DELETE FROM public.lesson_topic_sections;

-- 8. Следы новой Tests-системы на уроках (уроки не удаляются)
UPDATE public.lessons
SET
  lesson_topic_id = NULL,
  homework_points_earned = NULL,
  homework_points_max = NULL,
  homework_percent = NULL;

COMMIT;
