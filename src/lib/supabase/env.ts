import { isStrictSupabaseMode } from '@/lib/crm/data-source';

export type StudentsDataSourcePreference = 'supabase' | 'localStorage' | 'auto';

export function isSupabaseConfigured(): boolean {
  if (isStrictSupabaseMode()) {
    return true;
  }

  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getStudentsDataSourcePreference(): StudentsDataSourcePreference {
  const value = process.env.NEXT_PUBLIC_STUDENTS_DATA_SOURCE?.trim().toLowerCase();

  if (value === 'localstorage' || value === 'local_storage') {
    return 'localStorage';
  }

  if (value === 'supabase') {
    return 'supabase';
  }

  return 'auto';
}

export function shouldUseSupabaseForStudents(): boolean {
  if (isStrictSupabaseMode()) {
    return true;
  }

  return shouldUseSupabaseForEntity(
    process.env.NEXT_PUBLIC_STUDENTS_DATA_SOURCE,
  );
}

export function shouldUseSupabaseForScheduleSlots(): boolean {
  if (isStrictSupabaseMode()) {
    return true;
  }

  return shouldUseSupabaseForEntity(
    process.env.NEXT_PUBLIC_SCHEDULE_SLOTS_DATA_SOURCE,
  );
}

export function shouldUseSupabaseForPayments(): boolean {
  if (isStrictSupabaseMode()) {
    return true;
  }

  return shouldUseSupabaseForEntity(
    process.env.NEXT_PUBLIC_PAYMENTS_DATA_SOURCE,
  );
}

export function shouldUseSupabaseForTrialLessons(): boolean {
  if (isStrictSupabaseMode()) {
    return true;
  }

  return shouldUseSupabaseForEntity(
    process.env.NEXT_PUBLIC_TRIAL_LESSONS_DATA_SOURCE,
  );
}

export function shouldUseSupabaseForIntensives(): boolean {
  if (isStrictSupabaseMode()) {
    return true;
  }

  return shouldUseSupabaseForEntity(
    process.env.NEXT_PUBLIC_INTENSIVES_DATA_SOURCE,
  );
}

export function shouldUseSupabaseForRevenueSnapshots(): boolean {
  if (isStrictSupabaseMode()) {
    return true;
  }

  return shouldUseSupabaseForEntity(
    process.env.NEXT_PUBLIC_REVENUE_SNAPSHOTS_DATA_SOURCE,
  );
}

export function shouldUseSupabaseForLessons(): boolean {
  if (isStrictSupabaseMode()) {
    return true;
  }

  return shouldUseSupabaseForEntity(
    process.env.NEXT_PUBLIC_LESSONS_DATA_SOURCE,
  );
}

function shouldUseSupabaseForEntity(
  rawPreference: string | undefined,
): boolean {
  const value = rawPreference?.trim().toLowerCase();

  if (value === 'localstorage' || value === 'local_storage') {
    return false;
  }

  if (value === 'supabase') {
    return isSupabaseConfigured();
  }

  return isSupabaseConfigured();
}
