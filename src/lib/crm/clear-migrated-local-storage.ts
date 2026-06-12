import { isStrictSupabaseMode } from '@/lib/crm/data-source';
import { PAYMENTS_STORAGE_KEY } from '@/lib/payments/local-storage';
import { SCHEDULE_SLOTS_STORAGE_KEY } from '@/lib/schedule-slots/local-storage';
import { STUDENTS_STORAGE_KEY } from '@/lib/students/local-storage';
import { INTENSIVES_STORAGE_KEY } from '@/lib/intensives/local-storage';
import { LESSONS_STORAGE_KEY } from '@/lib/lessons/local-storage';
import { REVENUE_SNAPSHOTS_STORAGE_KEY } from '@/lib/revenue-snapshots/local-storage';
import { TRIAL_LESSONS_STORAGE_KEY } from '@/lib/trial-lessons/local-storage';

export const MIGRATED_CRM_LOCAL_STORAGE_KEYS = [
  STUDENTS_STORAGE_KEY,
  SCHEDULE_SLOTS_STORAGE_KEY,
  PAYMENTS_STORAGE_KEY,
  TRIAL_LESSONS_STORAGE_KEY,
  INTENSIVES_STORAGE_KEY,
  REVENUE_SNAPSHOTS_STORAGE_KEY,
  LESSONS_STORAGE_KEY,
] as const;

let cleared = false;

/** Removes legacy mock keys once strict Supabase mode is active in the browser. */
export function clearMigratedCrmLocalStorageIfStrictMode(): void {
  if (!isStrictSupabaseMode() || typeof window === 'undefined' || cleared) {
    return;
  }

  for (const key of MIGRATED_CRM_LOCAL_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }

  cleared = true;
}
