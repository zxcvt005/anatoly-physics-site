-- Store student pause periods so unmarked-past generation can skip dates
-- that fell while the student was paused (after they are resumed).
-- Interval semantics: from inclusive, to exclusive; to null = still paused.

alter table public.students
  add column if not exists pause_intervals jsonb not null default '[]'::jsonb;

comment on column public.students.pause_intervals is
  'JSON array of {from: YYYY-MM-DD, to: YYYY-MM-DD|null}; from inclusive, to exclusive.';
