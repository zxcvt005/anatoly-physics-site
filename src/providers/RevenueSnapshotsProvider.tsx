'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type CrmLoadState,
  getStrictSupabaseInitialLoadState,
  isCrmEntityHydrated,
  isStrictSupabaseMode,
  shouldFallbackMigratedEntityToLocalStorage,
} from '@/lib/crm/data-source';
import { hydrateMigratedEntity } from '@/lib/crm/supabase-entity-hydration';
import {
  fetchRevenueSnapshotsFromSupabase,
  seedRevenueSnapshotsToSupabase,
  upsertRevenueSnapshotInSupabase,
  upsertRevenueSnapshotsInSupabase,
} from '@/lib/crm/api/revenue-snapshots';
import {
  createMonthSnapshot,
  getMonthKey,
  parseMonthKey,
} from '@/lib/revenue-calculations';
import {
  readRevenueSnapshotsFromLocalStorage,
  writeRevenueSnapshotsToLocalStorage,
} from '@/lib/revenue-snapshots/local-storage';
import { shouldUseSupabaseForRevenueSnapshots } from '@/lib/supabase/env';
import type { Payment, RevenueMonthSnapshot, Student } from '@/types/tutor';

type RevenueSnapshotsDataSource = 'supabase' | 'localStorage';

interface RevenueSnapshotsContextValue {
  snapshots: RevenueMonthSnapshot[];
  hydrated: boolean;
  loadState: CrmLoadState;
  loadError: string | null;
  freezePastMonths: (students: Student[], payments: Payment[]) => void;
  upsertSnapshot: (snapshot: RevenueMonthSnapshot) => void;
}

const RevenueSnapshotsContext =
  createContext<RevenueSnapshotsContextValue | null>(null);

function getPreviousMonthKeys(beforeMonthKey: string): string[] {
  const { year, month } = parseMonthKey(beforeMonthKey);
  const keys: string[] = [];
  let cursorYear = year;
  let cursorMonth = month - 1;

  while (keys.length < 24) {
    if (cursorMonth < 1) {
      cursorMonth = 12;
      cursorYear -= 1;
    }

    const key = `${cursorYear}-${String(cursorMonth).padStart(2, '0')}`;
    keys.push(key);
    cursorMonth -= 1;
  }

  return keys;
}

function sortSnapshots(
  snapshots: RevenueMonthSnapshot[],
): RevenueMonthSnapshot[] {
  return [...snapshots].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function mergeSnapshot(
  snapshots: RevenueMonthSnapshot[],
  snapshot: RevenueMonthSnapshot,
): RevenueMonthSnapshot[] {
  const without = snapshots.filter((item) => item.monthKey !== snapshot.monthKey);
  return sortSnapshots([...without, snapshot]);
}

function computeSnapshotsToFreeze(
  currentSnapshots: RevenueMonthSnapshot[],
  students: Student[],
  payments: Payment[],
): RevenueMonthSnapshot[] {
  const currentMonthKey = getMonthKey(new Date());
  const paymentMonthKeys = payments
    .filter((payment) => payment.status === 'confirmed')
    .map((payment) => payment.createdAt.slice(0, 7));
  const candidateKeys = new Set([
    ...getPreviousMonthKeys(currentMonthKey),
    ...paymentMonthKeys,
  ]);
  const existing = new Set(currentSnapshots.map((item) => item.monthKey));
  const toAdd: RevenueMonthSnapshot[] = [];

  for (const monthKey of candidateKeys) {
    if (monthKey >= currentMonthKey) continue;
    if (existing.has(monthKey)) continue;

    const hasPayments = payments.some(
      (payment) =>
        payment.status === 'confirmed' &&
        payment.createdAt.slice(0, 7) === monthKey,
    );

    if (!hasPayments) continue;

    toAdd.push(createMonthSnapshot(monthKey, students, payments));
  }

  return toAdd;
}

function shouldPersistRevenueSnapshots(
  dataSource: RevenueSnapshotsDataSource,
): boolean {
  if (shouldUseSupabaseForRevenueSnapshots()) {
    return true;
  }

  return dataSource === 'supabase';
}

export function RevenueSnapshotsProvider({
  children,
  initialSnapshots,
}: {
  children: React.ReactNode;
  initialSnapshots: RevenueMonthSnapshot[];
}) {
  const [snapshots, setSnapshots] = useState<RevenueMonthSnapshot[]>(() =>
    isStrictSupabaseMode() ? [] : initialSnapshots,
  );
  const [loadState, setLoadState] = useState<CrmLoadState>(
    getStrictSupabaseInitialLoadState,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydrated = isCrmEntityHydrated(loadState);
  const dataSourceRef = useRef<RevenueSnapshotsDataSource>('localStorage');
  const freezePersistChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    async function hydrateRevenueSnapshots() {
      const result = await hydrateMigratedEntity({
        entityLabel: 'revenue-snapshots',
        useSupabase: shouldUseSupabaseForRevenueSnapshots(),
        fetchFromSupabase: fetchRevenueSnapshotsFromSupabase,
        readLocalFallback: () =>
          isStrictSupabaseMode()
            ? []
            : readRevenueSnapshotsFromLocalStorage(initialSnapshots),
        readLocalSeedSource: () =>
          readRevenueSnapshotsFromLocalStorage(initialSnapshots),
        seedToSupabase: seedRevenueSnapshotsToSupabase,
        getLength: (data) => data.length,
      });

      if (cancelled) {
        return;
      }

      if (result.status === 'error') {
        setSnapshots([]);
        setLoadState('error');
        setLoadError(result.error);
        dataSourceRef.current = 'localStorage';
        return;
      }

      setSnapshots(result.data);
      dataSourceRef.current = result.source;
      setLoadState('ready');
      setLoadError(null);
    }

    void hydrateRevenueSnapshots();

    return () => {
      cancelled = true;
    };
  }, [initialSnapshots]);

  useEffect(() => {
    if (
      !hydrated ||
      dataSourceRef.current !== 'localStorage' ||
      !shouldFallbackMigratedEntityToLocalStorage()
    ) {
      return;
    }

    writeRevenueSnapshotsToLocalStorage(snapshots);
  }, [snapshots, hydrated]);

  const upsertSnapshot = useCallback((snapshot: RevenueMonthSnapshot) => {
    setSnapshots((current) => mergeSnapshot(current, snapshot));

    if (!shouldPersistRevenueSnapshots(dataSourceRef.current)) {
      return;
    }

    void upsertRevenueSnapshotInSupabase(snapshot).then((result) => {
      if (result.ok) {
        setSnapshots((current) => mergeSnapshot(current, result.data));
        return;
      }

      console.error('[revenue-snapshots] Supabase upsert failed:', result.error);
    });
  }, []);

  const freezePastMonths = useCallback(
    (students: Student[], payments: Payment[]) => {
      if (!hydrated) {
        return;
      }

      let toAdd: RevenueMonthSnapshot[] = [];

      setSnapshots((current) => {
        toAdd = computeSnapshotsToFreeze(current, students, payments);

        if (toAdd.length === 0) {
          return current;
        }

        return sortSnapshots([...current, ...toAdd]);
      });

      if (toAdd.length === 0 || !shouldPersistRevenueSnapshots(dataSourceRef.current)) {
        return;
      }

      freezePersistChainRef.current = freezePersistChainRef.current
        .catch(() => undefined)
        .then(async () => {
          const result = await upsertRevenueSnapshotsInSupabase(toAdd);

          if (!result.ok) {
            console.error(
              '[revenue-snapshots] Supabase freeze failed:',
              result.error,
            );
            setSnapshots((current) => {
              const frozenKeys = new Set(toAdd.map((item) => item.monthKey));
              return current.filter((item) => !frozenKeys.has(item.monthKey));
            });
            return;
          }

          setSnapshots(result.data);
        });
    },
    [hydrated],
  );

  const value = useMemo(
    () => ({
      snapshots,
      hydrated,
      loadState,
      loadError,
      freezePastMonths,
      upsertSnapshot,
    }),
    [
      snapshots,
      hydrated,
      loadState,
      loadError,
      freezePastMonths,
      upsertSnapshot,
    ],
  );

  return (
    <RevenueSnapshotsContext.Provider value={value}>
      {children}
    </RevenueSnapshotsContext.Provider>
  );
}

export function useRevenueSnapshots() {
  const context = useContext(RevenueSnapshotsContext);
  if (!context) {
    throw new Error(
      'useRevenueSnapshots must be used within RevenueSnapshotsProvider',
    );
  }
  return context;
}
