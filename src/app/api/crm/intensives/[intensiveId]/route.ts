import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  deleteIntensiveFromSupabase,
  updateIntensiveTitleInSupabase,
} from '@/lib/supabase/intensives/repository';

interface RouteContext {
  params: Promise<{ intensiveId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { intensiveId } = await context.params;
  const body = (await request.json()) as { title?: string };

  if (!body.title) {
    return crmApiJson({ ok: false, error: 'Missing title' });
  }

  return crmApiJson(
    await updateIntensiveTitleInSupabase(intensiveId, body.title),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { intensiveId } = await context.params;
  return crmApiJson(await deleteIntensiveFromSupabase(intensiveId));
}
