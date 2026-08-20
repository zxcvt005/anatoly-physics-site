export const SUPABASE_SERVICE_ROLE_KEY_ENV = 'SUPABASE_SERVICE_ROLE_KEY';

export const SUPABASE_SERVICE_ROLE_MISSING_MESSAGE =
  'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for server-side Supabase operations';

export function resolveServiceRoleKeyFromEnv(
  env: Record<string, string | undefined>,
): string | undefined {
  return env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;
}
