-- RLS для revenue_month_snapshots (серверный CRM-клиент с publishable key fallback).
-- app_id не нужен: month_key уже unique natural key.

alter table public.revenue_month_snapshots enable row level security;

drop policy if exists revenue_month_snapshots_select_anon on public.revenue_month_snapshots;
drop policy if exists revenue_month_snapshots_insert_anon on public.revenue_month_snapshots;
drop policy if exists revenue_month_snapshots_update_anon on public.revenue_month_snapshots;
drop policy if exists revenue_month_snapshots_delete_anon on public.revenue_month_snapshots;

create policy revenue_month_snapshots_select_anon
  on public.revenue_month_snapshots for select to anon, authenticated using (true);

create policy revenue_month_snapshots_insert_anon
  on public.revenue_month_snapshots for insert to anon, authenticated with check (true);

create policy revenue_month_snapshots_update_anon
  on public.revenue_month_snapshots for update to anon, authenticated using (true) with check (true);

create policy revenue_month_snapshots_delete_anon
  on public.revenue_month_snapshots for delete to anon, authenticated using (true);
