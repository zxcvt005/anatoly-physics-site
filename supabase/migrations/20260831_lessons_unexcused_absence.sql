-- =============================================================================
-- Пропуск без предупреждения: boolean-признак на lessons
-- Дата: 2026-08-31
-- =============================================================================

alter table public.lessons
  add column if not exists is_unexcused_absence boolean not null default false;
