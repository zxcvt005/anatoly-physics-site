-- =============================================================================
-- CRM репетитора — схема Supabase (PostgreSQL)
-- Вставьте целиком в Supabase SQL Editor одним запуском.
-- RLS и авторизация намеренно не включены.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Расширения и утилиты
-- -----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. ENUM-типы
-- -----------------------------------------------------------------------------

create type public.student_activity_status as enum ('active', 'paused');

create type public.payment_status as enum ('confirmed', 'pending', 'rejected');

create type public.lesson_status as enum ('scheduled', 'completed');

create type public.lesson_payment_status as enum ('paid', 'unpaid', 'pending');

create type public.attendance_status as enum (
  'planned',
  'present',
  'absent',
  'late',
  'transferred'
);

create type public.homework_status as enum ('done', 'partial', 'not_done');

create type public.lesson_type as enum ('regular', 'makeup', 'extra', 'transfer');

create type public.makeup_status as enum ('none', 'scheduled', 'completed');

create type public.intensive_status as enum ('not_started', 'in_progress', 'completed');

create type public.trial_call_status as enum ('not_called', 'agreed', 'not_agreed');

-- -----------------------------------------------------------------------------
-- 2. students
-- -----------------------------------------------------------------------------

create table public.students (
  id uuid primary key default gen_random_uuid(),
  app_id text not null, -- Student.id в приложении (s1, s-1739..., совместимость с localStorage)
  first_name text not null,
  last_name text not null,
  name text not null,
  grade_class text not null,
  access_token text not null, -- Student.token в текущем приложении (/student/[token])
  rate_4_weeks integer not null check (rate_4_weeks >= 0),
  lessons_per_week integer not null check (lessons_per_week > 0),
  started_at date,
  parent_contacts text,
  activity_status public.student_activity_status not null default 'active',
  pause_comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint students_access_token_unique unique (access_token),
  constraint students_app_id_unique unique (app_id),
  constraint students_pause_comment_when_paused check (
    activity_status = 'paused' or pause_comment is null
  )
);

create index students_activity_status_idx on public.students (activity_status);
create index students_name_idx on public.students (last_name, first_name);
create index students_started_at_idx on public.students (started_at);

create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. schedule_slots
-- -----------------------------------------------------------------------------

create table public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  app_id text not null, -- WeeklyScheduleSlot.id в приложении (slot-mon-1, slot-1739...)
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint schedule_slots_time_order check (start_time < end_time),
  constraint schedule_slots_app_id_unique unique (app_id)
);

create index schedule_slots_weekday_start_idx
  on public.schedule_slots (weekday, start_time);

create trigger schedule_slots_set_updated_at
before update on public.schedule_slots
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. schedule_slot_students (many-to-many)
-- -----------------------------------------------------------------------------

create table public.schedule_slot_students (
  id uuid primary key default gen_random_uuid(),
  schedule_slot_id uuid not null references public.schedule_slots (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint schedule_slot_students_unique unique (schedule_slot_id, student_id)
);

create index schedule_slot_students_student_idx
  on public.schedule_slot_students (student_id);

-- -----------------------------------------------------------------------------
-- 5. intensives
-- -----------------------------------------------------------------------------

create table public.intensives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint intensives_title_not_empty check (char_length(trim(title)) > 0)
);

create trigger intensives_set_updated_at
before update on public.intensives
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. lessons
-- -----------------------------------------------------------------------------

-- lesson_at = Lesson.date в текущем приложении (дата и время начала)
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  lesson_at timestamptz not null,
  end_time time,
  status public.lesson_status not null default 'scheduled',
  payment_status public.lesson_payment_status not null default 'unpaid',
  lesson_type public.lesson_type not null default 'regular',
  is_outside_schedule boolean not null default false,
  makeup_for_lesson_id uuid references public.lessons (id) on delete set null,
  makeup_status public.makeup_status not null default 'none',
  is_chargeable boolean,
  topic text,
  attendance public.attendance_status,
  homework_status public.homework_status,
  homework_score smallint check (homework_score is null or homework_score between 0 and 10),
  comment text,
  transferred_to_lesson_id uuid references public.lessons (id) on delete set null,
  transferred_from_lesson_id uuid references public.lessons (id) on delete set null,
  transfer_comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lessons_transfer_pair_distinct check (
    transferred_to_lesson_id is null
    or transferred_from_lesson_id is null
    or transferred_to_lesson_id <> transferred_from_lesson_id
  ),
  constraint lessons_no_self_makeup check (
    makeup_for_lesson_id is null or makeup_for_lesson_id <> id
  ),
  constraint lessons_no_self_transfer_to check (
    transferred_to_lesson_id is null or transferred_to_lesson_id <> id
  ),
  constraint lessons_no_self_transfer_from check (
    transferred_from_lesson_id is null or transferred_from_lesson_id <> id
  )
);

create index lessons_student_lesson_at_idx on public.lessons (student_id, lesson_at);
create index lessons_status_lesson_at_idx on public.lessons (status, lesson_at);
create index lessons_makeup_for_lesson_idx on public.lessons (makeup_for_lesson_id);
create index lessons_transferred_to_idx on public.lessons (transferred_to_lesson_id);
create index lessons_transferred_from_idx on public.lessons (transferred_from_lesson_id);

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. payments
-- -----------------------------------------------------------------------------

-- created_at = дата оплаты (соответствует Payment.createdAt в текущем приложении)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  app_id text not null, -- Payment.id в приложении (p-1739...)
  student_id uuid not null references public.students (id) on delete restrict,
  amount integer not null check (amount > 0),
  status public.payment_status not null default 'pending',
  note text,
  tax_accounted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payments_app_id_unique unique (app_id)
);

create index payments_app_id_idx on public.payments (app_id);
create index payments_student_created_at_idx on public.payments (student_id, created_at desc);
create index payments_status_created_at_idx on public.payments (status, created_at desc);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. student_intensive_progress
-- -----------------------------------------------------------------------------

create table public.student_intensive_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  intensive_id uuid not null references public.intensives (id) on delete cascade,
  status public.intensive_status not null default 'not_started',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint student_intensive_progress_unique unique (student_id, intensive_id)
);

create index student_intensive_progress_intensive_idx
  on public.student_intensive_progress (intensive_id);

create trigger student_intensive_progress_set_updated_at
before update on public.student_intensive_progress
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. trial_lessons
-- -----------------------------------------------------------------------------

create table public.trial_lessons (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  trial_date date not null,
  grade_class text not null,
  goal text not null,
  current_result text not null,
  proposed_rate_4_weeks integer not null check (proposed_rate_4_weeks > 0),
  proposed_lessons_per_week integer not null check (proposed_lessons_per_week > 0),
  parent_name text not null,
  parent_phone text not null,
  parent_contacts text,
  call_status public.trial_call_status not null default 'not_called',
  comment text,
  linked_student_id uuid references public.students (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index trial_lessons_trial_date_idx on public.trial_lessons (trial_date);
create index trial_lessons_call_status_idx on public.trial_lessons (call_status);
create index trial_lessons_linked_student_idx on public.trial_lessons (linked_student_id);

create trigger trial_lessons_set_updated_at
before update on public.trial_lessons
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. revenue_month_snapshots
-- -----------------------------------------------------------------------------

create table public.revenue_month_snapshots (
  id uuid primary key default gen_random_uuid(),
  month_key text not null,
  potential_income integer not null check (potential_income >= 0),
  received_income integer not null check (received_income >= 0),
  frozen_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint revenue_month_snapshots_month_key_unique unique (month_key),
  constraint revenue_month_snapshots_month_key_format check (
    month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'
  )
);

create trigger revenue_month_snapshots_set_updated_at
before update on public.revenue_month_snapshots
for each row execute function public.set_updated_at();
