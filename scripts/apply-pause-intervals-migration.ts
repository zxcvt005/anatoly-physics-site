/**
 * Checks whether pause_intervals exists. DDL cannot run via PostgREST —
 * apply supabase/migrations/20261111_student_pause_intervals.sql in the
 * Supabase SQL editor, then run: npx tsx scripts/seed-ilona-pause-interval.ts
 */
import {
  bootstrapIntegrationProcessEnv,
  createIntegrationSupabaseClient,
  resolveIntegrationSupabaseConfig,
} from './lib/supabase-integration-env';

async function main() {
  bootstrapIntegrationProcessEnv();
  const config = resolveIntegrationSupabaseConfig(process.env);
  if (!config) throw new Error('Missing Supabase integration config');

  const client = createIntegrationSupabaseClient(config);
  const probe = await client.from('students').select('pause_intervals').limit(1);

  if (!probe.error) {
    console.log('pause_intervals column is present');
    return;
  }

  console.error('pause_intervals missing:', probe.error.message);
  console.error(
    'Apply supabase/migrations/20261111_student_pause_intervals.sql in Supabase SQL editor, then seed Ilona.',
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
