-- =============================================================================
-- Расходы CRM (планшет, подарок, профи, зарплата, другое)
-- Дата: 2026-10-01
-- НЕ применять к production без явного подтверждения.
--
-- Доступ: только service_role (сервер CRM после проверки cookie администратора).
-- Политик для anon / authenticated / студентов нет.
--
-- Обычный тип с датой и учеником (планшет, подарок, другое и будущие такие же):
-- student_id + expense_date, без периода и без employee_name.
-- «Профи» — одна запись на период, без ученика и без сотрудника.
-- «Зарплата» — дата и employee_name, без ученика и без периода.
-- Новый тип с периодом, отличный от pro, потребует расширить expenses_shape_check.
-- =============================================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  type text not null,
  student_id uuid references public.students (id) on delete cascade,
  amount integer not null,
  expense_date date,
  period_start date,
  period_end date,
  description text,
  employee_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint expenses_app_id_unique unique (app_id),
  constraint expenses_app_id_not_empty
    check (char_length(trim(app_id)) > 0),
  constraint expenses_type_not_empty
    check (char_length(trim(type)) > 0),
  constraint expenses_amount_positive
    check (amount > 0),
  constraint expenses_shape_check check (
    (
      type = 'pro'
      and student_id is null
      and employee_name is null
      and expense_date is null
      and period_start is not null
      and period_end is not null
      and period_end >= period_start
    )
    or (
      type = 'salary'
      and student_id is null
      and expense_date is not null
      and period_start is null
      and period_end is null
      and char_length(trim(employee_name)) > 0
    )
    or (
      type <> 'pro'
      and type <> 'salary'
      and student_id is not null
      and employee_name is null
      and expense_date is not null
      and period_start is null
      and period_end is null
    )
  ),
  constraint expenses_other_description_check check (
    type <> 'other'
    or char_length(trim(description)) > 0
  )
);

create index if not exists expenses_app_id_idx
  on public.expenses (app_id);

create index if not exists expenses_expense_date_idx
  on public.expenses (expense_date desc);

create index if not exists expenses_student_id_idx
  on public.expenses (student_id);

create index if not exists expenses_type_idx
  on public.expenses (type);

create index if not exists expenses_pro_period_idx
  on public.expenses (period_start, period_end)
  where type = 'pro';

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

comment on table public.expenses is
  'Расходы репетитора. Месяц группировки: expense_date, для pro — period_start. Удаление ученика каскадом удаляет его расходы; записи pro и salary без ученика остаются.';

comment on column public.expenses.type is
  'Код типа. pro — период без ученика. salary — дата и имя сотрудника, без ученика. Остальные типы — один ученик и одна дата.';

comment on column public.expenses.student_id is
  'uuid ученика. Обязателен для типов с учеником. Для pro и salary всегда NULL.';

comment on column public.expenses.employee_name is
  'Имя сотрудника. Обязательно для salary, для остальных типов NULL. Не связано со students.';

alter table public.expenses enable row level security;

drop policy if exists expenses_service_role_all on public.expenses;
create policy expenses_service_role_all
  on public.expenses
  for all
  to service_role
  using (true)
  with check (true);

-- Итоги считаются в SQL, чтобы клиент не суммировал всю историю.
-- Новые типы автоматически попадают в byType через group by.
create or replace function public.expense_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with type_totals as (
    select
      coalesce(jsonb_object_agg(grouped.type, grouped.total), '{}'::jsonb) as by_type,
      coalesce(sum(grouped.total), 0)::bigint as total
    from (
      select type, sum(amount)::bigint as total
      from public.expenses
      group by type
    ) as grouped
  ),
  student_stats as (
    select count(*)::int as student_count
    from public.students
  ),
  gifts as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'studentId', gift_rows.app_id,
          'studentName', gift_rows.name,
          'count', gift_rows.gift_count
        )
        order by gift_rows.gift_count desc, gift_rows.name
      ),
      '[]'::jsonb
    ) as items
    from (
      select
        s.app_id,
        s.name,
        count(*)::int as gift_count
      from public.expenses e
      join public.students s on s.id = e.student_id
      where e.type = 'gift'
        and e.student_id is not null
      group by s.app_id, s.name
    ) as gift_rows
  )
  select jsonb_build_object(
    'byType', (select by_type from type_totals),
    'total', (select total from type_totals),
    'studentCount', (select student_count from student_stats),
    'averagePerStudent',
      case
        when (select student_count from student_stats) = 0 then 0
        else round(
          (select total from type_totals)::numeric
          / (select student_count from student_stats)
        )::bigint
      end,
    'gifts', (select items from gifts)
  );
$$;

comment on function public.expense_summary() is
  'Суммы расходов по типам, включая зарплаты. Средний расход = все типы / число учеников. Подарки считаются только по type = gift.';

revoke all on function public.expense_summary() from public;
revoke all on function public.expense_summary() from anon;
revoke all on function public.expense_summary() from authenticated;
grant execute on function public.expense_summary() to service_role;
