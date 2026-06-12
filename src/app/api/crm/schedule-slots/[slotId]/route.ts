import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  deleteScheduleSlotFromSupabase,
  updateScheduleSlotInSupabase,
} from '@/lib/supabase/schedule-slots/repository';
import type { WeeklyScheduleSlot } from '@/types/tutor';

interface RouteContext {
  params: Promise<{ slotId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { slotId } = await context.params;
  const body = (await request.json()) as {
    patch?: Partial<WeeklyScheduleSlot>;
    existingSlot?: WeeklyScheduleSlot;
  };

  if (!body.patch || !body.existingSlot) {
    return crmApiJson({ ok: false, error: 'Missing patch or existingSlot' });
  }

  return crmApiJson(
    await updateScheduleSlotInSupabase(slotId, body.patch, body.existingSlot),
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { slotId } = await context.params;
  return crmApiJson(await deleteScheduleSlotFromSupabase(slotId));
}
