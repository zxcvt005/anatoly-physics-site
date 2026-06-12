-- RLS для lessons (серверный CRM-клиент с publishable key fallback).
-- Запустите после 20250614_lessons_app_id.sql.

alter table public.lessons enable row level security;

drop policy if exists lessons_select_anon on public.lessons;
drop policy if exists lessons_insert_anon on public.lessons;
drop policy if exists lessons_update_anon on public.lessons;
drop policy if exists lessons_delete_anon on public.lessons;

create policy lessons_select_anon
  on public.lessons for select to anon, authenticated using (true);

create policy lessons_insert_anon
  on public.lessons for insert to anon, authenticated with check (true);

create policy lessons_update_anon
  on public.lessons for update to anon, authenticated using (true) with check (true);

create policy lessons_delete_anon
  on public.lessons for delete to anon, authenticated using (true);
