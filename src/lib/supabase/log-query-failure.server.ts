import 'server-only';

import type { PostgrestError } from '@supabase/supabase-js';
import {
  getCrmOperationDurationMs,
  logCrmFailure,
} from '@/lib/crm/diagnostics/log-failure.server';

export function logSupabaseQueryFailure(
  operation: string,
  error: PostgrestError | null | undefined,
  startedAt?: number,
): void {
  logCrmFailure({
    operation,
    durationMs:
      startedAt === undefined ? undefined : getCrmOperationDurationMs(startedAt),
    error: error?.message ?? 'Unknown Supabase query error',
    supabaseError: error ?? undefined,
  });
}

export function logRepositoryFailure(
  operation: string,
  error: unknown,
  startedAt?: number,
): void {
  logCrmFailure({
    operation,
    durationMs:
      startedAt === undefined ? undefined : getCrmOperationDurationMs(startedAt),
    error,
  });
}
