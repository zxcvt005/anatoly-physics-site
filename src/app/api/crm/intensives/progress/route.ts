import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { updateStudentIntensiveProgressInSupabase } from '@/lib/supabase/intensives/repository';
import type { IntensiveStatus } from '@/types/tutor';

const INTENSIVE_STATUSES = new Set<IntensiveStatus>([
  'not_started',
  'in_progress',
  'completed',
]);

export async function PATCH(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as {
    studentId?: string;
    intensiveId?: string;
    status?: IntensiveStatus;
  };

  if (!body.studentId?.trim() || !body.intensiveId?.trim() || !body.status) {
    return crmApiJson({
      ok: false,
      error: 'Missing studentId, intensiveId, or status',
    });
  }

  if (!INTENSIVE_STATUSES.has(body.status)) {
    return crmApiJson({
      ok: false,
      error: 'Invalid status',
    });
  }

  return crmApiJson(
    await updateStudentIntensiveProgressInSupabase(
      body.studentId,
      body.intensiveId,
      body.status,
    ),
  );
}
