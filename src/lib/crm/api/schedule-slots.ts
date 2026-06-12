import type { WeeklyScheduleSlot } from '@/types/tutor';
import type { ScheduleSlotsRepositoryResult } from '@/lib/supabase/schedule-slots/types';
import { crmApiDelete, crmApiGet, crmApiPatch, crmApiPost } from './http';

const BASE = '/api/crm/schedule-slots';

export async function fetchScheduleSlotsFromSupabase(): Promise<
  ScheduleSlotsRepositoryResult<WeeklyScheduleSlot[]>
> {
  return crmApiGet<WeeklyScheduleSlot[]>(BASE);
}

export async function insertScheduleSlotToSupabase(
  slot: WeeklyScheduleSlot,
): Promise<ScheduleSlotsRepositoryResult<WeeklyScheduleSlot>> {
  return crmApiPost<WeeklyScheduleSlot>(BASE, { slot });
}

export async function updateScheduleSlotInSupabase(
  slotAppId: string,
  patch: Partial<WeeklyScheduleSlot>,
  existingSlot: WeeklyScheduleSlot,
): Promise<ScheduleSlotsRepositoryResult<WeeklyScheduleSlot>> {
  return crmApiPatch<WeeklyScheduleSlot>(
    `${BASE}/${encodeURIComponent(slotAppId)}`,
    { patch, existingSlot },
  );
}

export async function deleteScheduleSlotFromSupabase(
  slotAppId: string,
): Promise<ScheduleSlotsRepositoryResult<null>> {
  return crmApiDelete<null>(`${BASE}/${encodeURIComponent(slotAppId)}`);
}

export async function seedScheduleSlotsToSupabase(
  slots: WeeklyScheduleSlot[],
): Promise<ScheduleSlotsRepositoryResult<WeeklyScheduleSlot[]>> {
  return crmApiPost<WeeklyScheduleSlot[]>(`${BASE}/seed`, { slots });
}
