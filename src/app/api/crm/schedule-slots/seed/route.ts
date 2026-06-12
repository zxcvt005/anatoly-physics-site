import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { seedScheduleSlotsToSupabase } from '@/lib/supabase/schedule-slots/repository';
import type { WeeklyScheduleSlot } from '@/types/tutor';

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const body = (await request.json()) as { slots?: WeeklyScheduleSlot[] };
  return crmApiJson(
    await seedScheduleSlotsToSupabase(body.slots ?? []),
    201,
  );
}
