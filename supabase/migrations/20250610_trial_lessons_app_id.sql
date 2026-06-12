-- app_id для совместимости TrialLesson.id (trial-1739...) с localStorage.
-- Запустите в Supabase SQL Editor, если trial_lessons уже создана без app_id.

alter table public.trial_lessons
  add column if not exists app_id text;

update public.trial_lessons
set app_id = id::text
where app_id is null;

alter table public.trial_lessons
  alter column app_id set not null;

alter table public.trial_lessons
  drop constraint if exists trial_lessons_app_id_unique;

alter table public.trial_lessons
  add constraint trial_lessons_app_id_unique unique (app_id);

create index if not exists trial_lessons_app_id_idx on public.trial_lessons (app_id);
