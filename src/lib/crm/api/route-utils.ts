import { NextResponse } from 'next/server';
import {
  logCrmFailure,
  type CrmFailureLogContext,
} from '@/lib/crm/diagnostics/log-failure.server';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';

type RepositoryResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type CrmApiJsonDiagnostics = Omit<
  CrmFailureLogContext,
  'error' | 'httpStatus'
>;

export function crmApiJson<T>(
  result: RepositoryResult<T>,
  status = 200,
  diagnostics?: CrmApiJsonDiagnostics,
) {
  if (!result.ok) {
    logCrmFailure({
      operation: diagnostics?.operation ?? 'crm-api-json',
      requestUrl: diagnostics?.requestUrl,
      httpStatus: diagnostics?.httpStatus ?? 400,
      durationMs: diagnostics?.durationMs,
      supabaseError: diagnostics?.supabaseError,
      error: result.error,
    });
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, { status });
}

export function crmApiNotConfigured(diagnostics?: CrmApiJsonDiagnostics) {
  logCrmFailure({
    operation: diagnostics?.operation ?? 'crm-api-not-configured',
    requestUrl: diagnostics?.requestUrl,
    httpStatus: diagnostics?.httpStatus ?? 503,
    durationMs: diagnostics?.durationMs,
    error: 'Supabase is not configured',
  });

  return NextResponse.json(
    { ok: false, error: 'Supabase is not configured' } satisfies RepositoryResult<never>,
    { status: 503 },
  );
}

export function assertSupabaseConfiguredOnServer() {
  if (!isSupabaseConfiguredOnServer()) {
    return crmApiNotConfigured();
  }

  return null;
}
