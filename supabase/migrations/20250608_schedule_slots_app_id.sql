-- app_id для совместимости WeeklyScheduleSlot.id (slot-mon-1, slot-1739...) с localStorage.
-- Запустите в Supabase SQL Editor, если schedule_slots уже создана без app_id.

alter table public.schedule_slots
  add column if not exists app_id text;

update public.schedule_slots
set app_id = id::text
where app_id is null;

alter table public.schedule_slots
  alter column app_id set not null;

alter table public.schedule_slots
  drop constraint if exists schedule_slots_app_id_unique;

alter table public.schedule_slots
  add constraint schedule_slots_app_id_unique unique (app_id);

create index if not exists schedule_slots_app_id_idx on public.schedule_slots (app_id);
