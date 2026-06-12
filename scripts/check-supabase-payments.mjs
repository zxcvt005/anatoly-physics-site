import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await client
  .from('payments')
  .select('app_id, amount, status, created_at, students(app_id)')
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('[payments-check] FAILED —', error.message);
  process.exit(1);
}

console.log(`[payments-check] OK — received ${data?.length ?? 0} payment(s)`);
console.log('[payments-check] data:', JSON.stringify(data, null, 2));
