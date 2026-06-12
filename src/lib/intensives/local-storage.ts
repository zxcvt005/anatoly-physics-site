import type {
  Intensive,
  StudentIntensiveProgress,
} from '@/types/tutor';

export const INTENSIVES_STORAGE_KEY = 'tutor-intensives-mock-v1';

export interface IntensivesLocalStorageSnapshot {
  intensives: Intensive[];
  progress: StudentIntensiveProgress[];
}

export function readIntensivesFromLocalStorage(
  fallbackIntensives: Intensive[],
  fallbackProgress: StudentIntensiveProgress[],
): IntensivesLocalStorageSnapshot {
  if (typeof window === 'undefined') {
    return {
      intensives: fallbackIntensives,
      progress: fallbackProgress,
    };
  }

  const stored = window.localStorage.getItem(INTENSIVES_STORAGE_KEY);

  if (!stored) {
    return {
      intensives: fallbackIntensives,
      progress: fallbackProgress,
    };
  }

  try {
    return JSON.parse(stored) as IntensivesLocalStorageSnapshot;
  } catch {
    return {
      intensives: fallbackIntensives,
      progress: fallbackProgress,
    };
  }
}

export function writeIntensivesToLocalStorage(
  snapshot: IntensivesLocalStorageSnapshot,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(INTENSIVES_STORAGE_KEY, JSON.stringify(snapshot));
}
