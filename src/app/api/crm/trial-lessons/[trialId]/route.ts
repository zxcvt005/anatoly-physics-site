import {
  withNormalizedTrialLastName,
  type TrialLessonFormInput,
} from '@/lib/trial-lessons/form';
import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  deleteTrialLessonFromSupabase,
  updateTrialLessonInSupabase,
} from '@/lib/supabase/trial-lessons/repository';
import type { TrialLesson } from '@/types/tutor';

interface RouteContext {
  params: Promise<{ trialId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { trialId } = await context.params;
  const body = (await request.json()) as {
    input?: TrialLessonFormInput;
    existingTrial?: TrialLesson;
  };

  if (!body.input || !body.existingTrial) {
    return crmApiJson({ ok: false, error: 'Missing input or existingTrial' });
  }

  return crmApiJson(
    await updateTrialLessonInSupabase(
      trialId,
      withNormalizedTrialLastName(body.input),
      withNormalizedTrialLastName(body.existingTrial),
    ),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { trialId } = await context.params;
  return crmApiJson(await deleteTrialLessonFromSupabase(trialId));
}
