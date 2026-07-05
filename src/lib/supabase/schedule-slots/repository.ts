import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import type { WeeklyScheduleSlot } from '@/types/tutor';
import {
  mapScheduleSlotRows,
  scheduleSlotRowToWeeklySlot,
  weeklySlotPatchToUpdateRow,
  weeklySlotToInsertRow,
} from './mappers';
import type {
  ScheduleSlotRow,
  ScheduleSlotWithStudentsRow,
  ScheduleSlotsRepositoryResult,
} from './types';

const SLOT_SELECT = `
  id,
  app_id,
  weekday,
  start_time,
  end_time,
  comment,
  created_at,
  updated_at,
  schedule_slot_students (
    created_at,
    students (
      app_id
    )
  )
`;

function getClient() {
  return createSupabaseAdminClient();
}

async function fetchStudentUuidMap(
  studentAppIds: string[],
): Promise<ScheduleSlotsRepositoryResult<Map<string, string>>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  if (studentAppIds.length === 0) {
    return { ok: true, data: new Map() };
  }

  const client = getClient();
  const uniqueAppIds = [...new Set(studentAppIds)];
  const { data, error } = await client
    .from('students')
    .select('id, app_id')
    .in('app_id', uniqueAppIds);

  if (error) {
    return { ok: false, error: error.message };
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.app_id, row.id);
  }

  return { ok: true, data: map };
}

async function getSlotUuidByAppId(
  slotAppId: string,
): Promise<ScheduleSlotsRepositoryResult<string>> {
  const client = getClient();
  const { data, error } = await client
    .from('schedule_slots')
    .select('id')
    .eq('app_id', slotAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'Schedule slot not found' };
  }

  return { ok: true, data: data.id };
}

async function syncSlotStudents(
  slotUuid: string,
  studentAppIds: string[],
): Promise<ScheduleSlotsRepositoryResult<null>> {
  const client = getClient();
  const { error: deleteError } = await client
    .from('schedule_slot_students')
    .delete()
    .eq('schedule_slot_id', slotUuid);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  if (studentAppIds.length === 0) {
    return { ok: true, data: null };
  }

  const studentMapResult = await fetchStudentUuidMap(studentAppIds);
  if (!studentMapResult.ok) {
    return studentMapResult;
  }

  const missingStudentIds = studentAppIds.filter(
    (appId) => !studentMapResult.data.has(appId),
  );

  if (missingStudentIds.length > 0) {
    return {
      ok: false,
      error: `Students not found in Supabase: ${missingStudentIds.join(', ')}`,
    };
  }

  const rows = studentAppIds.map((appId) => ({
    schedule_slot_id: slotUuid,
    student_id: studentMapResult.data.get(appId)!,
  }));

  const { error: insertError } = await client
    .from('schedule_slot_students')
    .insert(rows);

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true, data: null };
}

async function fetchSlotByAppId(
  slotAppId: string,
): Promise<ScheduleSlotsRepositoryResult<WeeklyScheduleSlot>> {
  const client = getClient();
  const { data, error } = await client
    .from('schedule_slots')
    .select(SLOT_SELECT)
    .eq('app_id', slotAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'Schedule slot not found' };
  }

  return {
    ok: true,
    data: scheduleSlotRowToWeeklySlot(data as ScheduleSlotWithStudentsRow),
  };
}

export async function fetchScheduleSlotsFromSupabase(): Promise<
  ScheduleSlotsRepositoryResult<WeeklyScheduleSlot[]>
> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('schedule_slots')
    .select(SLOT_SELECT)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: mapScheduleSlotRows(data as ScheduleSlotWithStudentsRow[] | null),
  };
}

export async function insertScheduleSlotToSupabase(
  slot: WeeklyScheduleSlot,
): Promise<ScheduleSlotsRepositoryResult<WeeklyScheduleSlot>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { data, error } = await client
    .from('schedule_slots')
    .insert(weeklySlotToInsertRow(slot))
    .select('id, app_id')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const slotRow = data as Pick<ScheduleSlotRow, 'id' | 'app_id'>;
  const syncResult = await syncSlotStudents(slotRow.id, slot.studentIds);

  if (!syncResult.ok) {
    await client.from('schedule_slots').delete().eq('id', slotRow.id);
    return syncResult;
  }

  return fetchSlotByAppId(slot.id);
}

export async function updateScheduleSlotInSupabase(
  slotAppId: string,
  patch: Partial<WeeklyScheduleSlot>,
  existingSlot: WeeklyScheduleSlot,
): Promise<ScheduleSlotsRepositoryResult<WeeklyScheduleSlot>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const merged: WeeklyScheduleSlot = {
    ...existingSlot,
    ...patch,
    studentIds: patch.studentIds
      ? [...patch.studentIds]
      : existingSlot.studentIds,
  };

  const { error } = await client
    .from('schedule_slots')
    .update(weeklySlotPatchToUpdateRow(patch, existingSlot))
    .eq('app_id', slotAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const slotUuidResult = await getSlotUuidByAppId(slotAppId);
  if (!slotUuidResult.ok) {
    return slotUuidResult;
  }

  const syncResult = await syncSlotStudents(
    slotUuidResult.data,
    merged.studentIds,
  );

  if (!syncResult.ok) {
    return syncResult;
  }

  return fetchSlotByAppId(slotAppId);
}

export async function deleteScheduleSlotFromSupabase(
  slotAppId: string,
): Promise<ScheduleSlotsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { error } = await client
    .from('schedule_slots')
    .delete()
    .eq('app_id', slotAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: null };
}

export async function seedScheduleSlotsToSupabase(
  slots: WeeklyScheduleSlot[],
): Promise<ScheduleSlotsRepositoryResult<WeeklyScheduleSlot[]>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  if (slots.length === 0) {
    return { ok: true, data: [] };
  }

  const studentMapResult = await fetchStudentUuidMap(
    slots.flatMap((slot) => slot.studentIds),
  );

  if (!studentMapResult.ok) {
    return studentMapResult;
  }

  const studentMap = studentMapResult.data;

  for (const slot of slots) {
    const filteredStudentIds = slot.studentIds.filter((appId) =>
      studentMap.has(appId),
    );

    const insertResult = await insertScheduleSlotToSupabase({
      ...slot,
      studentIds: filteredStudentIds,
    });

    if (!insertResult.ok) {
      return insertResult;
    }
  }

  return fetchScheduleSlotsFromSupabase();
}
