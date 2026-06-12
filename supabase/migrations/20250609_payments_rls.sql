-- Временные MVP-политики RLS для payments (anon / publishable key).
-- Запустите после миграции app_id, если RLS уже включён и блокирует доступ.

alter table public.payments enable row level security;

drop policy if exists payments_select_anon on public.payments;
drop policy if exists payments_insert_anon on public.payments;
drop policy if exists payments_update_anon on public.payments;
drop policy if exists payments_delete_anon on public.payments;

create policy payments_select_anon
  on public.payments
  for select
  to anon, authenticated
  using (true);

create policy payments_insert_anon
  on public.payments
  for insert
  to anon, authenticated
  with check (true);

create policy payments_update_anon
  on public.payments
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy payments_delete_anon
  on public.payments
  for delete
  to anon, authenticated
  using (true);
