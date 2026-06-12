-- RLS для intensives и student_intensive_progress (серверный CRM-клиент).
-- Согласовано с trial_lessons / payments. Запустите после 20250612_intensives_app_id.sql.

alter table public.intensives enable row level security;
alter table public.student_intensive_progress enable row level security;

drop policy if exists intensives_select_anon on public.intensives;
drop policy if exists intensives_insert_anon on public.intensives;
drop policy if exists intensives_update_anon on public.intensives;
drop policy if exists intensives_delete_anon on public.intensives;

create policy intensives_select_anon
  on public.intensives for select to anon, authenticated using (true);

create policy intensives_insert_anon
  on public.intensives for insert to anon, authenticated with check (true);

create policy intensives_update_anon
  on public.intensives for update to anon, authenticated using (true) with check (true);

create policy intensives_delete_anon
  on public.intensives for delete to anon, authenticated using (true);

drop policy if exists student_intensive_progress_select_anon on public.student_intensive_progress;
drop policy if exists student_intensive_progress_insert_anon on public.student_intensive_progress;
drop policy if exists student_intensive_progress_update_anon on public.student_intensive_progress;
drop policy if exists student_intensive_progress_delete_anon on public.student_intensive_progress;

create policy student_intensive_progress_select_anon
  on public.student_intensive_progress for select to anon, authenticated using (true);

create policy student_intensive_progress_insert_anon
  on public.student_intensive_progress for insert to anon, authenticated with check (true);

create policy student_intensive_progress_update_anon
  on public.student_intensive_progress for update to anon, authenticated using (true) with check (true);

create policy student_intensive_progress_delete_anon
  on public.student_intensive_progress for delete to anon, authenticated using (true);
