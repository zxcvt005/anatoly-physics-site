import 'server-only';

function readSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function readSupabaseServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function isSupabaseConfiguredOnServer(): boolean {
  return Boolean(readSupabaseUrl() && readSupabaseServiceRoleKey());
}

export function getSupabaseUrl(): string {
  const url = readSupabaseUrl();

  if (!url) {
    throw new Error(
      'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL). Add it to .env.local.',
    );
  }

  return url;
}

export function getSupabaseServiceRoleKey(): string {
  const key = readSupabaseServiceRoleKey();

  if (!key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (server-only).',
    );
  }

  return key;
}
