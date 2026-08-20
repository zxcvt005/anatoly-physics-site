import 'server-only';

import {
  resolveServiceRoleKeyFromEnv,
  SUPABASE_SERVICE_ROLE_KEY_ENV,
  SUPABASE_SERVICE_ROLE_MISSING_MESSAGE,
} from '@/lib/supabase/service-role-env';

export {
  resolveServiceRoleKeyFromEnv,
  SUPABASE_SERVICE_ROLE_KEY_ENV,
  SUPABASE_SERVICE_ROLE_MISSING_MESSAGE,
};

function readSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function readSupabaseServiceRoleKey(): string | undefined {
  return resolveServiceRoleKeyFromEnv(process.env);
}

export function isSupabaseServiceRoleConfigured(): boolean {
  return Boolean(readSupabaseUrl() && readSupabaseServiceRoleKey());
}

export function isSupabaseConfiguredOnServer(): boolean {
  return isSupabaseServiceRoleConfigured();
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
      `Missing ${SUPABASE_SERVICE_ROLE_KEY_ENV}. Add it to the server environment (Vercel Project Settings → Environment Variables).`,
    );
  }

  return key;
}
