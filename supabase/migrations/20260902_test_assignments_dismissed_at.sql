-- Allow students to hide an assignment from their active task list without deleting it.
alter table public.test_assignments
  add column if not exists dismissed_at timestamptz null;

comment on column public.test_assignments.dismissed_at is
  'When set, the student hid this assignment from their active homework list. Does not affect completion, grading, or statistics.';
