import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import {
  logRepositoryFailure,
  logSupabaseQueryFailure,
} from '@/lib/supabase/log-query-failure.server';
import { startCrmOperationTimer } from '@/lib/crm/diagnostics/log-failure.server';
import type {
  LegalConsentRecord,
  LegalConsentSource,
  LegalConsentType,
  RecordLegalConsentInput,
  StudentLegalConsentsSnapshot,
} from '@/types/legal-consent';
import type { LegalConsentsRepositoryResult } from './types';

interface LegalConsentRow {
  consent_type: LegalConsentType;
  document_version: string;
  source: LegalConsentSource;
  created_at: string;
}

function getClient() {
  return createSupabaseAdminClient();
}

function mapRow(row: LegalConsentRow): LegalConsentRecord {
  return {
    consentType: row.consent_type,
    documentVersion: row.document_version,
    source: row.source,
    grantedAt: row.created_at,
  };
}

async function resolveStudentUuidByAppId(
  studentAppId: string,
): Promise<LegalConsentsRepositoryResult<string>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('app_id', studentAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data?.id) {
    return { ok: false, error: 'Student not found' };
  }

  return { ok: true, data: data.id };
}

async function resolveStudentUuidByToken(
  token: string,
): Promise<LegalConsentsRepositoryResult<string>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('access_token', token)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data?.id) {
    return { ok: false, error: 'Student not found' };
  }

  return { ok: true, data: data.id };
}

function buildSnapshot(rows: LegalConsentRow[]): StudentLegalConsentsSnapshot {
  const latestByType = new Map<LegalConsentType, LegalConsentRecord>();

  for (const row of rows) {
    if (!latestByType.has(row.consent_type)) {
      latestByType.set(row.consent_type, mapRow(row));
    }
  }

  return {
    privacy: latestByType.get('privacy') ?? null,
    offer: latestByType.get('offer') ?? null,
    marketing: latestByType.get('marketing') ?? null,
  };
}

export async function fetchStudentLegalConsentsByToken(
  token: string,
): Promise<LegalConsentsRepositoryResult<StudentLegalConsentsSnapshot>> {
  const operation = 'fetchStudentLegalConsentsByToken';
  const startedAt = startCrmOperationTimer();

  const studentResult = await resolveStudentUuidByToken(token);
  if (!studentResult.ok) {
    logRepositoryFailure(operation, studentResult.error, startedAt);
    return studentResult;
  }

  if (!isSupabaseConfiguredOnServer()) {
    return {
      ok: true,
      data: { privacy: null, offer: null, marketing: null },
    };
  }

  const client = getClient();
  const { data, error } = await client
    .from('legal_consents')
    .select('consent_type, document_version, source, created_at')
    .eq('student_id', studentResult.data)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseQueryFailure(operation, error, startedAt);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: buildSnapshot((data ?? []) as LegalConsentRow[]),
  };
}

export async function recordStudentLegalConsentsByToken(
  token: string,
  consents: RecordLegalConsentInput[],
  userAgent?: string,
): Promise<LegalConsentsRepositoryResult<StudentLegalConsentsSnapshot>> {
  const operation = 'recordStudentLegalConsentsByToken';
  const startedAt = startCrmOperationTimer();

  const studentResult = await resolveStudentUuidByToken(token);
  if (!studentResult.ok) {
    logRepositoryFailure(operation, studentResult.error, startedAt);
    return studentResult;
  }

  if (!isSupabaseConfiguredOnServer()) {
    return {
      ok: true,
      data: { privacy: null, offer: null, marketing: null },
    };
  }

  const client = getClient();
  const rows = consents.map((consent) => ({
    student_id: studentResult.data,
    consent_type: consent.consentType,
    document_version: consent.documentVersion,
    source: consent.source,
    context_ref: consent.contextRef ?? null,
    user_agent: userAgent ?? null,
  }));

  const { error } = await client
    .from('legal_consents')
    .upsert(rows, {
      onConflict: 'student_id,consent_type,document_version',
      ignoreDuplicates: true,
    });

  if (error) {
    logSupabaseQueryFailure(operation, error, startedAt);
    return { ok: false, error: error.message };
  }

  return fetchStudentLegalConsentsByToken(token);
}

export async function recordStudentLegalConsentsByAppId(
  studentAppId: string,
  consents: RecordLegalConsentInput[],
  userAgent?: string,
): Promise<LegalConsentsRepositoryResult<StudentLegalConsentsSnapshot>> {
  const operation = 'recordStudentLegalConsentsByAppId';
  const startedAt = startCrmOperationTimer();

  const studentResult = await resolveStudentUuidByAppId(studentAppId);
  if (!studentResult.ok) {
    logRepositoryFailure(operation, studentResult.error, startedAt);
    return studentResult;
  }

  if (!isSupabaseConfiguredOnServer()) {
    return {
      ok: true,
      data: { privacy: null, offer: null, marketing: null },
    };
  }

  const client = getClient();
  const rows = consents.map((consent) => ({
    student_id: studentResult.data,
    consent_type: consent.consentType,
    document_version: consent.documentVersion,
    source: consent.source,
    context_ref: consent.contextRef ?? null,
    user_agent: userAgent ?? null,
  }));

  const { error } = await client
    .from('legal_consents')
    .upsert(rows, {
      onConflict: 'student_id,consent_type,document_version',
      ignoreDuplicates: true,
    });

  if (error) {
    logSupabaseQueryFailure(operation, error, startedAt);
    return { ok: false, error: error.message };
  }

  const { data, error: fetchError } = await client
    .from('legal_consents')
    .select('consent_type, document_version, source, created_at')
    .eq('student_id', studentResult.data)
    .order('created_at', { ascending: false });

  if (fetchError) {
    logSupabaseQueryFailure(`${operation}.fetch`, fetchError, startedAt);
    return { ok: false, error: fetchError.message };
  }

  return {
    ok: true,
    data: buildSnapshot((data ?? []) as LegalConsentRow[]),
  };
}
