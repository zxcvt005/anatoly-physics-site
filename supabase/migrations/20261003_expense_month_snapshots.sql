-- =============================================================================
-- Снимки количества учеников для среднемесячного расхода
-- Дата: 2026-10-03
-- НЕ применять к production без явного подтверждения.
--
-- Отдельная миграция: не изменяет 20261001_expenses.sql.
--
-- Логика (сервер CRM):
-- - текущий месяц (finalized = false): student_count обновляется live;
-- - прошлый месяц: при первом обращении после смены месяца finalized = true
--   и больше не меняется;
-- - месяцы без snapshot при первом внедрении получают текущий student_count
--   и сразу finalized = true (исторически неидеально, но дальше стабильно).
--
-- Доступ: только service_role (как expenses).
-- =============================================================================

create table if not exists public.expense_month_snapshots (
  id uuid primary key default gen_random_uuid(),
  month_key text not null,
  student_count integer not null,
  finalized boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint expense_month_snapshots_month_key_unique unique (month_key),
  constraint expense_month_snapshots_month_key_format check (
    month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'
  ),
  constraint expense_month_snapshots_student_count_non_negative
    check (student_count >= 0)
);

create index if not exists expense_month_snapshots_month_key_idx
  on public.expense_month_snapshots (month_key);

create index if not exists expense_month_snapshots_finalized_idx
  on public.expense_month_snapshots (finalized);

drop trigger if exists expense_month_snapshots_set_updated_at
  on public.expense_month_snapshots;
create trigger expense_month_snapshots_set_updated_at
before update on public.expense_month_snapshots
for each row execute function public.set_updated_at();

comment on table public.expense_month_snapshots is
  'Количество учеников для среднего расхода по месяцу. Текущий месяц — live (finalized=false), прошлые — зафиксированы.';

comment on column public.expense_month_snapshots.month_key is
  'YYYY-MM в часовом поясе CRM (Europe/Moscow).';

comment on column public.expense_month_snapshots.student_count is
  'Знаменатель среднего расхода за месяц. Не зависит от фильтра типа расходов.';

comment on column public.expense_month_snapshots.finalized is
  'true — месяц закрыт, значение не обновляется. false — текущий/ещё не закрытый месяц.';

alter table public.expense_month_snapshots enable row level security;

drop policy if exists expense_month_snapshots_service_role_all
  on public.expense_month_snapshots;
create policy expense_month_snapshots_service_role_all
  on public.expense_month_snapshots
  for all
  to service_role
  using (true)
  with check (true);
