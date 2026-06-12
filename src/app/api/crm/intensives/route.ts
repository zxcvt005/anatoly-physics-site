import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchIntensivesBundleFromSupabase,
  insertIntensiveToSupabase,
} from '@/lib/supabase/intensives/repository';
import type { Intensive } from '@/types/tutor';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  return crmApiJson(await fetchIntensivesBundleFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { intensive?: Intensive };
  if (!body.intensive) {
    return crmApiJson({ ok: false, error: 'Missing intensive' });
  }

  return crmApiJson(await insertIntensiveToSupabase(body.intensive), 201);
}
