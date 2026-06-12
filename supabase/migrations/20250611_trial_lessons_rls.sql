-- RLS для trial_lessons: доступ серверного CRM-клиента через Next.js API.
--
-- Контекст:
-- - Браузер не ходит в Supabase; доступ к данным только через /api/crm/* (admin cookie).
-- - Сервер использует createSupabaseAdminClient().
-- - Если задан SUPABASE_SERVICE_ROLE_KEY, роль service_role обходит RLS (политики не нужны).
-- - Если используется publishable key (fallback в env.server.ts), клиент работает как anon
--   и без политик INSERT/UPDATE/DELETE блокируются.
--
-- Политики ниже согласованы с public.payments (см. 20250609_payments_rls.sql).
-- Запустите после 20250610_trial_lessons_app_id.sql.

alter table public.trial_lessons enable row level security;

drop policy if exists trial_lessons_select_anon on public.trial_lessons;
drop policy if exists trial_lessons_insert_anon on public.trial_lessons;
drop policy if exists trial_lessons_update_anon on public.trial_lessons;
drop policy if exists trial_lessons_delete_anon on public.trial_lessons;

create policy trial_lessons_select_anon
  on public.trial_lessons
  for select
  to anon, authenticated
  using (true);

create policy trial_lessons_insert_anon
  on public.trial_lessons
  for insert
  to anon, authenticated
  with check (true);

create policy trial_lessons_update_anon
  on public.trial_lessons
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy trial_lessons_delete_anon
  on public.trial_lessons
  for delete
  to anon, authenticated
  using (true);
