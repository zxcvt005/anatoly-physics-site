import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  isSupabaseServiceRoleConfigured,
  SUPABASE_SERVICE_ROLE_MISSING_MESSAGE,
} from '@/lib/supabase/env.server';
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
import { logLegalConsentInsert, logLegalConsentInsertFailure } from './diagnostics.server';
import type { LegalConsentsRepositoryResult } from './types';

interface LegalConsentRow {
  consent_type: LegalConsentType;
  document_version: string;
  source: LegalConsentSource;
  created_at: string;
}

interface ResolvedStudent {
  uuid: string;
  appId: string;
}

function getClient() {
  return createSupabaseAdminClient();
}

function serviceRoleConfigError(): LegalConsentsRepositoryResult<never> {
  return { ok: false, error: SUPABASE_SERVICE_ROLE_MISSING_MESSAGE };
}

function mapRow(row: LegalConsentRow): LegalConsentRecord {
  return {
    consentType: row.consent_type,
    documentVersion: row.document_version,
    source: row.source,
    grantedAt: row.created_at,
  };
}

async function resolveStudentByAppId(
  studentAppId: string,
): Promise<LegalConsentsRepositoryResult<ResolvedStudent>> {
  if (!isSupabaseServiceRoleConfigured()) {
    return serviceRoleConfigError();
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id, app_id')
    .eq('app_id', studentAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data?.id || !data.app_id) {
    return { ok: false, error: 'Student not found' };
  }

  return { ok: true, data: { uuid: data.id, appId: data.app_id } };
}

async function resolveStudentByToken(
  token: string,
): Promise<LegalConsentsRepositoryResult<ResolvedStudent>> {
  if (!isSupabaseServiceRoleConfigured()) {
    return serviceRoleConfigError();
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id, app_id')
    .eq('access_token', token)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data?.id || !data.app_id) {
    return { ok: false, error: 'Student not found' };
  }

  return { ok: true, data: { uuid: data.id, appId: data.app_id } };
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

  const studentResult = await resolveStudentByToken(token);
  if (!studentResult.ok) {
    logRepositoryFailure(operation, studentResult.error, startedAt);
    return studentResult;
  }

  const client = getClient();
  const { data, error } = await client
    .from('legal_consents')
    .select('consent_type, document_version, source, created_at')
    .eq('student_id', studentResult.data.uuid)
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

  const studentResult = await resolveStudentByToken(token);
  if (!studentResult.ok) {
    logRepositoryFailure(operation, studentResult.error, startedAt);
    return studentResult;
  }

  const client = getClient();
  const rows = consents.map((consent) => ({
    student_id: studentResult.data.uuid,
    consent_type: consent.consentType,
    document_version: consent.documentVersion,
    source: consent.source,
    context_ref: consent.contextRef ?? null,
    user_agent: userAgent ?? null,
  }));

  const { error } = await client.from('legal_consents').upsert(rows, {
    onConflict: 'student_id,consent_type,document_version',
    ignoreDuplicates: true,
  });

  if (error) {
    logLegalConsentInsertFailure({
      studentAppId: studentResult.data.appId,
      consents,
      error,
    });
    logSupabaseQueryFailure(operation, error, startedAt);
    return { ok: false, error: error.message };
  }

  logLegalConsentInsert({
    studentAppId: studentResult.data.appId,
    consentTypes: consents.map((consent) => consent.consentType),
    documentVersions: consents.map((consent) => consent.documentVersion),
    source: consents[0]?.source,
    ok: true,
  });

  return fetchStudentLegalConsentsByToken(token);
}

export async function recordStudentLegalConsentsByAppId(
  studentAppId: string,
  consents: RecordLegalConsentInput[],
  userAgent?: string,
): Promise<LegalConsentsRepositoryResult<StudentLegalConsentsSnapshot>> {
  const operation = 'recordStudentLegalConsentsByAppId';
  const startedAt = startCrmOperationTimer();

  const studentResult = await resolveStudentByAppId(studentAppId);
  if (!studentResult.ok) {
    logRepositoryFailure(operation, studentResult.error, startedAt);
    return studentResult;
  }

  const client = getClient();
  const rows = consents.map((consent) => ({
    student_id: studentResult.data.uuid,
    consent_type: consent.consentType,
    document_version: consent.documentVersion,
    source: consent.source,
    context_ref: consent.contextRef ?? null,
    user_agent: userAgent ?? null,
  }));

  const { error } = await client.from('legal_consents').upsert(rows, {
    onConflict: 'student_id,consent_type,document_version',
    ignoreDuplicates: true,
  });

  if (error) {
    logLegalConsentInsertFailure({
      studentAppId: studentResult.data.appId,
      consents,
      error,
    });
    logSupabaseQueryFailure(operation, error, startedAt);
    return { ok: false, error: error.message };
  }

  logLegalConsentInsert({
    studentAppId: studentResult.data.appId,
    consentTypes: consents.map((consent) => consent.consentType),
    documentVersions: consents.map((consent) => consent.documentVersion),
    source: consents[0]?.source,
    ok: true,
  });

  const { data, error: fetchError } = await client
    .from('legal_consents')
    .select('consent_type, document_version, source, created_at')
    .eq('student_id', studentResult.data.uuid)
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
