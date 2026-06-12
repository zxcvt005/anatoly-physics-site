-- Добавляет app_id для совместимости Student.id (s1, s-1739...) с localStorage.
-- Запустите в Supabase SQL Editor, если таблица students уже создана без app_id.

alter table public.students
  add column if not exists app_id text;

update public.students
set app_id = id::text
where app_id is null;

alter table public.students
  alter column app_id set not null;

alter table public.students
  drop constraint if exists students_app_id_unique;

alter table public.students
  add constraint students_app_id_unique unique (app_id);

create index if not exists students_app_id_idx on public.students (app_id);
