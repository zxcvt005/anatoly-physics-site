-- =============================================================================
-- Пробники (mock exams) + результаты учеников
-- Дата: 2026-09-09
-- НЕ применять к production без явного подтверждения.
-- =============================================================================

create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  title text not null,
  exam_date date not null,
  max_score integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mock_exams_app_id_unique unique (app_id),
  constraint mock_exams_title_not_empty
    check (char_length(trim(title)) > 0),
  constraint mock_exams_max_score_positive
    check (max_score > 0)
);

create index if not exists mock_exams_app_id_idx
  on public.mock_exams (app_id);

create index if not exists mock_exams_exam_date_idx
  on public.mock_exams (exam_date asc, created_at asc);

create table if not exists public.mock_exam_results (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  mock_exam_id uuid not null
    references public.mock_exams (id) on delete cascade,
  student_id uuid not null
    references public.students (id) on delete cascade,
  score integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mock_exam_results_app_id_unique unique (app_id),
  constraint mock_exam_results_score_non_negative
    check (score >= 0)
);

create unique index if not exists mock_exam_results_student_exam_unique
  on public.mock_exam_results (student_id, mock_exam_id);

create index if not exists mock_exam_results_mock_exam_idx
  on public.mock_exam_results (mock_exam_id);

create index if not exists mock_exam_results_student_idx
  on public.mock_exam_results (student_id);

create index if not exists mock_exam_results_app_id_idx
  on public.mock_exam_results (app_id);

comment on table public.mock_exams is
  'Пробники: метаданные пробного экзамена (название, дата, максимум баллов).';

comment on table public.mock_exam_results is
  'Результаты пробников. Пустая клетка = нет строки; 0 баллов = score = 0.';

alter table public.mock_exams enable row level security;
alter table public.mock_exam_results enable row level security;

drop policy if exists mock_exams_service_role_all on public.mock_exams;
create policy mock_exams_service_role_all
  on public.mock_exams
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists mock_exam_results_service_role_all on public.mock_exam_results;
create policy mock_exam_results_service_role_all
  on public.mock_exam_results
  for all
  to service_role
  using (true)
  with check (true);
