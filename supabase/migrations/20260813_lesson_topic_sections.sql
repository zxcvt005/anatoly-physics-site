-- =============================================================================
-- Группировка lesson_topics по разделам (lesson_topic_sections)
-- Дата: 2026-08-13
-- НЕ применять к production без явного подтверждения.
-- =============================================================================
--
-- Существующие lesson_topics сохраняются; section_id остаётся NULL («Без раздела»).
-- Удаление раздела отвязывает темы (ON DELETE SET NULL), не удаляя их.
--
-- =============================================================================

create table public.lesson_topic_sections (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  title text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lesson_topic_sections_app_id_unique unique (app_id),
  constraint lesson_topic_sections_title_not_empty check (char_length(trim(title)) > 0)
);

create index lesson_topic_sections_sort_order_idx
  on public.lesson_topic_sections (sort_order, title);

create index lesson_topic_sections_active_idx
  on public.lesson_topic_sections (is_active)
  where is_active = true;

create trigger lesson_topic_sections_set_updated_at
before update on public.lesson_topic_sections
for each row execute function public.set_updated_at();

alter table public.lesson_topics
  add column section_id uuid references public.lesson_topic_sections (id) on delete set null;

create index lesson_topics_section_id_idx
  on public.lesson_topics (section_id);

create index lesson_topics_section_sort_idx
  on public.lesson_topics (section_id, sort_order, title);
