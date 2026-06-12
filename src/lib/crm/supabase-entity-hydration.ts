import { clearMigratedCrmLocalStorageIfStrictMode } from '@/lib/crm/clear-migrated-local-storage';
import {
  CRM_DATABASE_ERROR_MESSAGE,
  isStrictSupabaseMode,
  shouldAllowSupabaseSeedFromLocalStorage,
  shouldFallbackMigratedEntityToLocalStorage,
} from '@/lib/crm/data-source';
import { isSupabaseConfigured } from '@/lib/supabase/env';

type RepositoryResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type HydratedEntitySource = 'supabase' | 'localStorage';

export type HydratedEntityResult<T> =
  | { status: 'ready'; data: T; source: HydratedEntitySource }
  | { status: 'error'; error: string };

export async function hydrateMigratedEntity<T>(options: {
  entityLabel: string;
  useSupabase: boolean;
  fetchFromSupabase: () => Promise<RepositoryResult<T>>;
  readLocalFallback: () => T;
  readLocalSeedSource: () => T;
  seedToSupabase?: (data: T) => Promise<RepositoryResult<T>>;
  getLength: (data: T) => number;
}): Promise<HydratedEntityResult<T>> {
  if (isStrictSupabaseMode()) {
    clearMigratedCrmLocalStorageIfStrictMode();
  }

  if (!options.useSupabase) {
    if (isStrictSupabaseMode()) {
      return { status: 'error', error: CRM_DATABASE_ERROR_MESSAGE };
    }

    return {
      status: 'ready',
      data: options.readLocalFallback(),
      source: 'localStorage',
    };
  }

  if (!isSupabaseConfigured()) {
    if (isStrictSupabaseMode()) {
      return { status: 'error', error: CRM_DATABASE_ERROR_MESSAGE };
    }

    return {
      status: 'ready',
      data: options.readLocalFallback(),
      source: 'localStorage',
    };
  }

  const fetchResult = await options.fetchFromSupabase();

  if (!fetchResult.ok) {
    if (isStrictSupabaseMode()) {
      console.error(
        `[${options.entityLabel}] Supabase fetch failed:`,
        fetchResult.error,
      );
      return { status: 'error', error: CRM_DATABASE_ERROR_MESSAGE };
    }

    if (shouldFallbackMigratedEntityToLocalStorage()) {
      console.warn(
        `[${options.entityLabel}] Supabase unavailable, using localStorage fallback:`,
        fetchResult.error,
      );
      return {
        status: 'ready',
        data: options.readLocalFallback(),
        source: 'localStorage',
      };
    }

    return { status: 'error', error: CRM_DATABASE_ERROR_MESSAGE };
  }

  let data = fetchResult.data;

  if (
    options.getLength(data) === 0 &&
    shouldAllowSupabaseSeedFromLocalStorage() &&
    options.seedToSupabase
  ) {
    const seedSource = options.readLocalSeedSource();

    if (options.getLength(seedSource) > 0) {
      const seedResult = await options.seedToSupabase(seedSource);

      if (!seedResult.ok) {
        if (isStrictSupabaseMode()) {
          console.error(
            `[${options.entityLabel}] Supabase seed failed:`,
            seedResult.error,
          );
          return { status: 'error', error: CRM_DATABASE_ERROR_MESSAGE };
        }

        if (shouldFallbackMigratedEntityToLocalStorage()) {
          console.warn(
            `[${options.entityLabel}] Supabase seed failed, using localStorage fallback:`,
            seedResult.error,
          );
          return {
            status: 'ready',
            data: options.readLocalFallback(),
            source: 'localStorage',
          };
        }

        return { status: 'error', error: CRM_DATABASE_ERROR_MESSAGE };
      }

      data = seedResult.data;
    }
  }

  return { status: 'ready', data, source: 'supabase' };
}
