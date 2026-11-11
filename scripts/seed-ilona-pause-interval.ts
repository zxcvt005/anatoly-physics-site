/**
 * One-time seed: Ilona's historical pause ending 2026-11-06 (exclusive resume day).
 * Does not delete or modify lessons/payments.
 *
 * Run after migration 20261111_student_pause_intervals.sql:
 *   npx tsx scripts/seed-ilona-pause-interval.ts
 */
import {
  bootstrapIntegrationProcessEnv,
  createIntegrationSupabaseClient,
  resolveIntegrationSupabaseConfig,
} from './lib/supabase-integration-env';

const ILONA_APP_ID = 's-1789388193221-bmg4';
const PAUSE_INTERVALS = [{ from: '2026-10-10', to: '2026-11-06' }];

async function main() {
  bootstrapIntegrationProcessEnv();
  const config = resolveIntegrationSupabaseConfig(process.env);
  if (!config) throw new Error('Missing Supabase integration config');

  const client = createIntegrationSupabaseClient(config);

  const { data: before, error: readError } = await client
    .from('students')
    .select('app_id, name, activity_status, pause_intervals')
    .eq('app_id', ILONA_APP_ID)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!before) throw new Error(`Student ${ILONA_APP_ID} not found`);

  console.log('before:', before);

  const { data: after, error: updateError } = await client
    .from('students')
    .update({ pause_intervals: PAUSE_INTERVALS })
    .eq('app_id', ILONA_APP_ID)
    .select('app_id, name, activity_status, pause_intervals')
    .single();

  if (updateError) throw new Error(updateError.message);

  console.log('after:', after);
  console.log('seed-ilona-pause-interval: done');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
