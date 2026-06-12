import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  fetchScheduleSlotsFromSupabase,
  insertScheduleSlotToSupabase,
} from '@/lib/supabase/schedule-slots/repository';
import type { WeeklyScheduleSlot } from '@/types/tutor';

export async function GET() {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  return crmApiJson(await fetchScheduleSlotsFromSupabase());
}

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { slot?: WeeklyScheduleSlot };
  if (!body.slot) {
    return crmApiJson({ ok: false, error: 'Missing slot' });
  }

  return crmApiJson(await insertScheduleSlotToSupabase(body.slot), 201);
}
