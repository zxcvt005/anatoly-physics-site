-- app_id для совместимости Payment.id (p-1739...) с localStorage.
-- Запустите в Supabase SQL Editor, если payments уже создана без app_id.

alter table public.payments
  add column if not exists app_id text;

update public.payments
set app_id = id::text
where app_id is null;

alter table public.payments
  alter column app_id set not null;

alter table public.payments
  drop constraint if exists payments_app_id_unique;

alter table public.payments
  add constraint payments_app_id_unique unique (app_id);

create index if not exists payments_app_id_idx on public.payments (app_id);
