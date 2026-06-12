export type CrmDataSource = 'mock' | 'supabase';

export type CrmLoadState = 'loading' | 'ready' | 'error';

export const CRM_DATABASE_ERROR_MESSAGE =
  'Не удалось подключиться к базе данных. Попробуйте обновить страницу.';

export function getCrmDataSource(): CrmDataSource {
  const value = process.env.NEXT_PUBLIC_CRM_DATA_SOURCE?.trim().toLowerCase();

  if (value === 'supabase') {
    return 'supabase';
  }

  return 'mock';
}

export function isStrictSupabaseMode(): boolean {
  return getCrmDataSource() === 'supabase';
}

export function shouldAllowSupabaseSeedFromLocalStorage(): boolean {
  if (!isStrictSupabaseMode()) {
    return true;
  }

  return (
    process.env.NEXT_PUBLIC_ALLOW_SUPABASE_SEED_FROM_LOCAL_STORAGE === 'true'
  );
}

export function shouldFallbackMigratedEntityToLocalStorage(): boolean {
  return !isStrictSupabaseMode();
}

export function getMockCrmInitialData<T>(mockData: T[]): T[] {
  return isStrictSupabaseMode() ? [] : mockData;
}

export function getStrictSupabaseInitialLoadState(): CrmLoadState {
  return isStrictSupabaseMode() ? 'loading' : 'ready';
}

export function isCrmEntityHydrated(loadState: CrmLoadState): boolean {
  return loadState !== 'loading';
}
