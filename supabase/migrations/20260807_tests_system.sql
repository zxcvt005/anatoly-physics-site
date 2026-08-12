-- =============================================================================
-- Система домашних заданий / тестов
-- Дата: 2026-08-07 (после 20250614_* migrations)
-- НЕ применять к production без явного подтверждения.
-- =============================================================================
--
-- Разделение legacy / new homework на lessons:
--   homework_status, homework_score     — только legacy (ручная оценка 0–10)
--   lesson_topic_id                     — тема, назначенная новой системой
--   homework_points_earned/max/percent  — snapshot итога из test_attempts
--   Статус assignment (assigned/in_progress/completed) — test_assignments.status
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUM-типы
-- -----------------------------------------------------------------------------

create type public.test_type as enum ('homework', 'intensive');

create type public.test_question_type as enum (
  'numeric',
  'short_text',
  'single_choice',
  'multiple_choice',
  'matching'
);

create type public.test_assignment_status as enum (
  'assigned',
  'in_progress',
  'completed'
);

create type public.test_assignment_source as enum ('lesson', 'self');

create type public.test_attempt_stage as enum (
  'draft_1',
  'graded_1',
  'draft_2',
  'completed'
);

-- -----------------------------------------------------------------------------
-- lesson_topics — темы уроков для ДЗ
-- -----------------------------------------------------------------------------

create table public.lesson_topics (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  title text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lesson_topics_app_id_unique unique (app_id),
  constraint lesson_topics_title_not_empty check (char_length(trim(title)) > 0)
);

create index lesson_topics_sort_order_idx on public.lesson_topics (sort_order, title);
create index lesson_topics_active_idx on public.lesson_topics (is_active) where is_active = true;

create trigger lesson_topics_set_updated_at
before update on public.lesson_topics
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- tests — единая сущность теста (homework / intensive)
-- ON DELETE RESTRICT: нельзя удалить topic/intensive с историей тестов
-- -----------------------------------------------------------------------------

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  test_type public.test_type not null,
  title text not null,
  lesson_topic_id uuid references public.lesson_topics (id) on delete restrict,
  intensive_id uuid references public.intensives (id) on delete restrict,
  version integer not null default 1,
  is_active boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tests_app_id_unique unique (app_id),
  constraint tests_title_not_empty check (char_length(trim(title)) > 0),
  constraint tests_type_link_check check (
    (test_type = 'homework' and lesson_topic_id is not null and intensive_id is null)
    or (test_type = 'intensive' and intensive_id is not null and lesson_topic_id is null)
  )
);

create unique index tests_homework_topic_unique
  on public.tests (lesson_topic_id)
  where test_type = 'homework' and is_active = true;

create unique index tests_intensive_unique
  on public.tests (intensive_id)
  where test_type = 'intensive' and is_active = true;

create index tests_type_idx on public.tests (test_type);

create trigger tests_set_updated_at
before update on public.tests
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- test_questions — ON DELETE RESTRICT на test_id
-- -----------------------------------------------------------------------------

create table public.test_questions (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  test_id uuid not null references public.tests (id) on delete restrict,
  test_version integer not null default 1,
  sort_order integer not null default 0,
  question_type public.test_question_type not null,
  prompt_text text not null,
  image_url text,
  max_points numeric(8, 2) not null default 1 check (max_points > 0),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint test_questions_app_id_unique unique (app_id),
  constraint test_questions_prompt_not_empty check (char_length(trim(prompt_text)) > 0)
);

create index test_questions_test_version_idx
  on public.test_questions (test_id, test_version, sort_order);

create trigger test_questions_set_updated_at
before update on public.test_questions
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- test_question_options
-- -----------------------------------------------------------------------------

create table public.test_question_options (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  question_id uuid not null references public.test_questions (id) on delete cascade,
  sort_order integer not null default 0,
  label_text text not null,
  is_correct boolean not null default false,
  match_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint test_question_options_app_id_unique unique (app_id),
  constraint test_question_options_label_not_empty check (char_length(trim(label_text)) > 0)
);

create index test_question_options_question_idx
  on public.test_question_options (question_id, sort_order);

create trigger test_question_options_set_updated_at
before update on public.test_question_options
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- test_assignments — источник истины для статуса ДЗ
-- -----------------------------------------------------------------------------

create table public.test_assignments (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  test_id uuid not null references public.tests (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  status public.test_assignment_status not null default 'assigned',
  source public.test_assignment_source not null default 'lesson',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint test_assignments_app_id_unique unique (app_id)
);

create index test_assignments_student_idx on public.test_assignments (student_id, status);
create index test_assignments_lesson_idx on public.test_assignments (lesson_id);
create unique index test_assignments_lesson_student_unique
  on public.test_assignments (lesson_id, student_id)
  where lesson_id is not null and source = 'lesson';

create trigger test_assignments_set_updated_at
before update on public.test_assignments
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- test_attempts — question_snapshot хранит frozen copy вопросов (с answer key)
-- -----------------------------------------------------------------------------

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  test_id uuid not null references public.tests (id) on delete restrict,
  test_version integer not null,
  student_id uuid not null references public.students (id) on delete cascade,
  assignment_id uuid references public.test_assignments (id) on delete set null,
  stage public.test_attempt_stage not null default 'draft_1',
  question_snapshot jsonb not null default '[]'::jsonb,
  first_attempt_correct integer,
  first_attempt_total integer,
  second_attempt_fixed integer,
  second_attempt_unknown integer,
  final_score numeric(10, 2),
  final_max_score numeric(10, 2),
  final_percent numeric(5, 2),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint test_attempts_app_id_unique unique (app_id)
);

create index test_attempts_student_test_idx
  on public.test_attempts (student_id, test_id, stage);
create index test_attempts_assignment_idx on public.test_attempts (assignment_id);

create trigger test_attempts_set_updated_at
before update on public.test_attempts
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- test_attempt_answers
-- -----------------------------------------------------------------------------

create table public.test_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts (id) on delete cascade,
  question_id uuid not null,
  attempt_number smallint not null check (attempt_number in (1, 2)),
  answer jsonb,
  is_correct boolean,
  is_unknown boolean not null default false,
  points_earned numeric(8, 2),
  first_attempt_was_wrong boolean,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint test_attempt_answers_unique unique (attempt_id, question_id, attempt_number)
);

create index test_attempt_answers_attempt_idx
  on public.test_attempt_answers (attempt_id);

create trigger test_attempt_answers_set_updated_at
before update on public.test_attempt_answers
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- lessons: snapshot-поля новой системы (НЕ homework_status)
-- -----------------------------------------------------------------------------

alter table public.lessons
  add column if not exists lesson_topic_id uuid references public.lesson_topics (id) on delete set null;

alter table public.lessons
  add column if not exists homework_points_earned numeric(8, 2);

alter table public.lessons
  add column if not exists homework_points_max numeric(8, 2);

alter table public.lessons
  add column if not exists homework_percent numeric(5, 2);

create index if not exists lessons_lesson_topic_idx on public.lessons (lesson_topic_id);
