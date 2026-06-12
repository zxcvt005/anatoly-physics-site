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
  .from('schedule_slots')
  .select(
    'app_id, weekday, start_time, end_time, schedule_slot_students(students(app_id))',
  )
  .limit(5);

if (error) {
  console.error('[schedule-slots-check] FAILED —', error.message);
  process.exit(1);
}

console.log(`[schedule-slots-check] OK — received ${data?.length ?? 0} slot(s)`);
console.log('[schedule-slots-check] data:', JSON.stringify(data, null, 2));
