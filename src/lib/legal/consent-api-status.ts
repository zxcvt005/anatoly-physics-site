import { SUPABASE_SERVICE_ROLE_MISSING_MESSAGE } from '@/lib/supabase/service-role-env';

export function resolveLegalConsentsApiStatus(error: string): number {
  if (error === 'Student not found') {
    return 404;
  }

  if (error === SUPABASE_SERVICE_ROLE_MISSING_MESSAGE) {
    return 503;
  }

  return 500;
}
