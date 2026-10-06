-- Add pattern effective dating for weekly schedule slots.
-- Needed so unmarked-past generation does not project a new weekday/time
-- onto dates before the schedule change.

alter table public.schedule_slots
  add column if not exists effective_from timestamptz;

alter table public.schedule_slots
  add column if not exists pattern_history jsonb not null default '[]'::jsonb;

-- Existing slots: current pattern has been active since creation.
update public.schedule_slots
set effective_from = created_at
where effective_from is null;

alter table public.schedule_slots
  alter column effective_from set default timezone('utc', now());

-- Keep effective_from populated for new rows even if the app omits it.
update public.schedule_slots
set effective_from = created_at
where effective_from is null;

alter table public.schedule_slots
  alter column effective_from set not null;
