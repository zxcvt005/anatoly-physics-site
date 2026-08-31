import fs from 'node:fs';
import path from 'node:path';
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import { resolveServiceRoleKeyFromEnv } from '../../src/lib/supabase/service-role-env';

const ENV_FILE_CANDIDATES = [
  '.env.local',
  '.env.vercel.production',
  '.env.vercel.local',
] as const;

export type IntegrationSupabaseConfig = {
  url: string;
  serviceKey: string;
  keyKind: 'SUPABASE_SERVICE_ROLE_KEY' | 'SUPABASE_SECRET_KEY';
};

export function loadIntegrationEnvFiles(): Record<string, string> {
  const env: Record<string, string> = {};

  for (const fileName of ENV_FILE_CANDIDATES) {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;

    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (value && value !== '[SENSITIVE]') {
        env[key] = value;
      }
    }
  }

  return env;
}

/** File-based env wins over inherited process.env for integration scripts. */
export function bootstrapIntegrationProcessEnv(): Record<string, string> {
  const fileEnv = loadIntegrationEnvFiles();

  if (Object.keys(fileEnv).length === 0) {
    throw new Error(
      'Missing usable env (.env.local or .env.vercel.production) for integration test',
    );
  }

  for (const [key, value] of Object.entries(fileEnv)) {
    process.env[key] = value;
  }

  return fileEnv;
}

export function resolveIntegrationSupabaseConfig(
  env: Record<string, string | undefined>,
): IntegrationSupabaseConfig | null {
  const url = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, '');
  const serviceKey = resolveServiceRoleKeyFromEnv(env);

  if (!url || !serviceKey) {
    return null;
  }

  const keyKind = env.SUPABASE_SERVICE_ROLE_KEY
    ? 'SUPABASE_SERVICE_ROLE_KEY'
    : 'SUPABASE_SECRET_KEY';

  return { url, serviceKey, keyKind };
}

type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  name?: string;
  cause?: unknown;
};

export function formatSupabaseOperationError(
  context: string,
  error: SupabaseLikeError,
  config: Partial<IntegrationSupabaseConfig>,
): string {
  const parts = [context];

  if (config.url) {
    parts.push(`projectUrl=${config.url}`);
  }

  if (config.keyKind) {
    parts.push(`keyEnv=${config.keyKind}`);
  }

  if (error.name) {
    parts.push(`name=${error.name}`);
  }

  if (typeof error.status === 'number') {
    parts.push(`httpStatus=${error.status}`);
  }

  if (error.code) {
    parts.push(`code=${error.code}`);
  }

  if (error.message) {
    parts.push(`message=${error.message}`);
  }

  if (error.details) {
    parts.push(`details=${error.details}`);
  }

  if (error.hint) {
    parts.push(`hint=${error.hint}`);
  }

  if (error.cause !== undefined && error.cause !== null) {
    parts.push(`cause=${formatUnknownCause(error.cause)}`);
  }

  return parts.join(' | ');
}

function formatUnknownCause(cause: unknown): string {
  if (cause instanceof Error) {
    return `${cause.name}: ${cause.message}`;
  }

  if (typeof cause === 'object' && cause !== null) {
    const record = cause as Record<string, unknown>;
    if ('code' in record || 'message' in record) {
      return JSON.stringify({
        code: record.code,
        message: record.message,
      });
    }
  }

  return String(cause);
}

export function createIntegrationSupabaseClient(
  config: IntegrationSupabaseConfig,
): SupabaseClient {
  return createClient(config.url, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function assertIntegrationSupabaseReachable(
  client: SupabaseClient,
  config: IntegrationSupabaseConfig,
): Promise<void> {
  const { error } = await client.from('students').select('id').limit(1);

  if (error) {
    throw new Error(
      formatSupabaseOperationError('Supabase preflight failed', error, config),
    );
  }
}

export function throwIfSupabaseError(
  context: string,
  error: PostgrestError | null,
  config: Partial<IntegrationSupabaseConfig>,
): void {
  if (!error) return;

  throw new Error(formatSupabaseOperationError(context, error, config));
}
