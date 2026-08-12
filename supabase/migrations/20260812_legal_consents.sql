-- =============================================================================
-- Юридические согласия (ПД, оферта, маркетинг)
-- Дата: 2026-08-12 (после 20260807_tests_system, 20260808_cleanup_legacy_homework)
-- НЕ применять к production без явного подтверждения.
-- =============================================================================

create type public.legal_consent_type as enum ('privacy', 'offer', 'marketing');

create type public.legal_consent_source as enum (
  'payment',
  'payment_report',
  'form'
);

create table public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  consent_type public.legal_consent_type not null,
  document_version text not null,
  source public.legal_consent_source not null,
  context_ref text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint legal_consents_document_version_not_empty
    check (char_length(trim(document_version)) > 0)
);

create index legal_consents_student_idx
  on public.legal_consents (student_id, created_at desc);

create index legal_consents_student_type_idx
  on public.legal_consents (student_id, consent_type, created_at desc);

create unique index legal_consents_student_type_version_unique
  on public.legal_consents (student_id, consent_type, document_version);

comment on table public.legal_consents is
  'Фиксация юридически значимых согласий ученика (ПД, оферта, маркетинг).';

-- RLS: доступ только через service role (как payments/lessons в CRM API)
alter table public.legal_consents enable row level security;

create policy legal_consents_service_role_all
  on public.legal_consents
  for all
  to service_role
  using (true)
  with check (true);
