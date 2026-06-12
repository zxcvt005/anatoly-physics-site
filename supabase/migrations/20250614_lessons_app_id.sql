-- app_id для совместимости Lesson.id (l-1739...) с localStorage.
-- Запустите в Supabase SQL Editor, если lessons уже создана без app_id.

alter table public.lessons
  add column if not exists app_id text;

update public.lessons
set app_id = id::text
where app_id is null;

alter table public.lessons
  alter column app_id set not null;

alter table public.lessons
  drop constraint if exists lessons_app_id_unique;

alter table public.lessons
  add constraint lessons_app_id_unique unique (app_id);

create index if not exists lessons_app_id_idx on public.lessons (app_id);
