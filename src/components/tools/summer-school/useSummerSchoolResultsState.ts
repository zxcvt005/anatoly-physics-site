'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SUMMER_SCHOOL_RESULTS,
  parseSummerSchoolResults,
  serializeSummerSchoolResults,
  SUMMER_SCHOOL_PLACES,
  SUMMER_SCHOOL_RESULTS_STORAGE_KEY,
  type SummerSchoolPlaceId,
  type SummerSchoolResultsState,
} from '@/lib/tools/summer-school-results';

function readStoredState(): SummerSchoolResultsState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SUMMER_SCHOOL_RESULTS };
  }

  return parseSummerSchoolResults(
    window.localStorage.getItem(SUMMER_SCHOOL_RESULTS_STORAGE_KEY),
  );
}

function writeStoredState(state: SummerSchoolResultsState): void {
  window.localStorage.setItem(
    SUMMER_SCHOOL_RESULTS_STORAGE_KEY,
    serializeSummerSchoolResults(state),
  );
}

export function useSummerSchoolResultsState() {
  const [state, setState] = useState<SummerSchoolResultsState>({
    ...DEFAULT_SUMMER_SCHOOL_RESULTS,
  });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setState(readStoredState());
    setIsHydrated(true);
  }, []);

  const apply = useCallback(
    (updater: (prev: SummerSchoolResultsState) => SummerSchoolResultsState) => {
      setState((prev) => {
        const normalized = parseSummerSchoolResults(
          serializeSummerSchoolResults(updater(prev)),
        );
        writeStoredState(normalized);
        return normalized;
      });
    },
    [],
  );

  const saveNames = useCallback(
    (names: {
      thirdPlaceName: string;
      secondPlaceName: string;
      firstPlaceName: string;
    }) => {
      apply((prev) => ({
        ...prev,
        thirdPlaceName: names.thirdPlaceName,
        secondPlaceName: names.secondPlaceName,
        firstPlaceName: names.firstPlaceName,
      }));
    },
    [apply],
  );

  const updatePlaceName = useCallback(
    (placeId: SummerSchoolPlaceId, name: string) => {
      const place = SUMMER_SCHOOL_PLACES[placeId];
      const trimmed = name.trim();
      apply((prev) => ({
        ...prev,
        [place.nameKey]: trimmed,
        [place.revealedKey]: trimmed.length > 0 ? prev[place.revealedKey] : false,
      }));
    },
    [apply],
  );

  const revealPlace = useCallback(
    (placeId: SummerSchoolPlaceId) => {
      const place = SUMMER_SCHOOL_PLACES[placeId];
      apply((prev) => {
        const currentName = prev[place.nameKey].trim();
        if (!currentName) {
          return prev;
        }

        return {
          ...prev,
          [place.revealedKey]: true,
        };
      });
    },
    [apply],
  );

  const setSettingsHidden = useCallback(
    (hidden: boolean) => {
      apply((prev) => ({
        ...prev,
        settingsHidden: hidden,
      }));
    },
    [apply],
  );

  return {
    state,
    isHydrated,
    saveNames,
    updatePlaceName,
    revealPlace,
    setSettingsHidden,
  };
}
