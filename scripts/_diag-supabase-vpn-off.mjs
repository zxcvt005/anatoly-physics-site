import { readFileSync } from 'node:fs';
import { lookup } from 'node:dns/promises';

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const host = url ? new URL(url).hostname : null;

const tables = [
  {
    name: 'students',
    path: '/rest/v1/students?select=app_id&limit=1',
    jsSelect: () => client.from('students').select('app_id').limit(1),
  },
  {
    name: 'schedule_slots',
    path: '/rest/v1/schedule_slots?select=app_id&limit=1',
    jsSelect: () =>
      client
        .from('schedule_slots')
        .select('app_id, schedule_slot_students(students(app_id))')
        .limit(1),
  },
  {
    name: 'payments',
    path: '/rest/v1/payments?select=app_id&limit=1',
    jsSelect: () =>
      client.from('payments').select('app_id, students(app_id)').limit(1),
  },
];

console.log('=== VPN-off Supabase diagnostic ===');
console.log('TIME:', new Date().toISOString());
console.log('HOST:', host);
console.log('BASE_URL:', url);
console.log('CRM_DATA_SOURCE:', process.env.NEXT_PUBLIC_CRM_DATA_SOURCE ?? '(not set -> mock)');
console.log('ALLOW_SEED:', process.env.NEXT_PUBLIC_ALLOW_SUPABASE_SEED_FROM_LOCAL_STORAGE ?? '(not set)');
console.log('');

if (!url || !key) {
  console.error('Missing Supabase env');
  process.exit(1);
}

try {
  const records = await lookup(host, { all: true });
  console.log('[DNS] OK', records);
} catch (error) {
  console.log('[DNS] FAILED', error.code, error.message);
}

async function restFetch(tableName, path) {
  const target = `${url}${path}`;
  console.log(`\n--- REST ${tableName} ---`);
  console.log('URL:', target);
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(target, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const elapsed = Date.now() - started;
    const body = await response.text();
    console.log('STATUS:', response.status, response.statusText, `(${elapsed}ms)`);
    console.log('CORS allow-origin:', response.headers.get('access-control-allow-origin'));
    console.log('sb-error-code:', response.headers.get('sb-error-code'));
    console.log('BODY:', body.slice(0, 500));
    return { ok: response.ok, status: response.status, body, elapsed };
  } catch (error) {
    const elapsed = Date.now() - started;
    console.log('FETCH EXCEPTION (%dms)', elapsed);
    console.log('  name:', error.name);
    console.log('  message:', error.message);
    if (error.cause) console.log('  cause:', error.cause);
    return { ok: false, exception: error };
  }
}

for (const table of tables) {
  await restFetch(table.name, table.path);
}

console.log('\n=== @supabase/supabase-js ===');
const { createClient } = await import('@supabase/supabase-js');
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const table of tables) {
  const started = Date.now();
  const { data, error } = await table.jsSelect();
  const elapsed = Date.now() - started;
  console.log(`\n--- JS ${table.name} (${elapsed}ms) ---`);
  if (error) {
    console.log('ERROR message:', error.message);
    console.log('ERROR code:', error.code);
    console.log('ERROR details:', error.details);
    console.log('ERROR hint:', error.hint);
  } else {
    console.log('OK rows:', Array.isArray(data) ? data.length : data);
    console.log('DATA preview:', JSON.stringify(data)?.slice(0, 300));
  }
}

// seed simulation: insert probe (rolled back by not committing - use select only for RLS read test)
console.log('\n=== RLS write probe (insert then delete if possible) ===');
const probeId = `diag-probe-${Date.now()}`;
const { data: students } = await client.from('students').select('id, app_id').limit(1);
if (students?.[0]) {
  const { error: insertError } = await client.from('payments').insert({
    app_id: probeId,
    student_id: students[0].id,
    amount: 1,
    status: 'pending',
  });
  if (insertError) {
    console.log('payments INSERT probe FAILED:', insertError.message, insertError.code);
  } else {
    console.log('payments INSERT probe OK');
    await client.from('payments').delete().eq('app_id', probeId);
  }
}
