-- app_id для совместимости Intensive.id (int-1, int-1739...) с localStorage.
-- Запустите в Supabase SQL Editor, если intensives уже создана без app_id.

alter table public.intensives
  add column if not exists app_id text;

update public.intensives
set app_id = id::text
where app_id is null;

alter table public.intensives
  alter column app_id set not null;

alter table public.intensives
  drop constraint if exists intensives_app_id_unique;

alter table public.intensives
  add constraint intensives_app_id_unique unique (app_id);

create index if not exists intensives_app_id_idx on public.intensives (app_id);
