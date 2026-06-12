import { NextResponse } from 'next/server';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';

type RepositoryResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function crmApiJson<T>(result: RepositoryResult<T>, status = 200) {
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, { status });
}

export function crmApiNotConfigured() {
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
