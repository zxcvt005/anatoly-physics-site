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
  fetchIntensivesBundleFromSupabase,
  insertIntensiveToSupabase,
  seedIntensivesBundleToSupabase,
  updateStudentIntensiveProgressInSupabase,
} from '@/lib/crm/api/intensives';
import { fetchStudentPortalIntensivesBundle } from '@/lib/crm/api/student-portal';
import {
  cycleIntensiveStatus,
  generateIntensiveId,
  parseProgressKey,
  progressKey,
} from '@/lib/intensive-utils';
import {
  readIntensivesFromLocalStorage,
  writeIntensivesToLocalStorage,
} from '@/lib/intensives/local-storage';
import { shouldUseSupabaseForIntensives } from '@/lib/supabase/env';
import type {
  Intensive,
  IntensiveStatus,
  Student,
  StudentIntensiveProgress,
} from '@/types/tutor';

type IntensivesDataSource = 'supabase' | 'localStorage' | 'student-portal';

interface IntensivesContextValue {
  intensives: Intensive[];
  hydrated: boolean;
  loadState: CrmLoadState;
  loadError: string | null;
  getStatus: (studentId: string, intensiveId: string) => IntensiveStatus;
  cycleStatus: (studentId: string, intensiveId: string) => void;
  addIntensive: (title: string) => void;
  getStudentIntensives: (
    studentId: string,
  ) => { intensive: Intensive; status: IntensiveStatus }[];
}

const IntensivesContext = createContext<IntensivesContextValue | null>(null);

function buildProgressMap(
  progress: StudentIntensiveProgress[],
): Map<string, IntensiveStatus> {
  const map = new Map<string, IntensiveStatus>();
  for (const entry of progress) {
    map.set(progressKey(entry.studentId, entry.intensiveId), entry.status);
  }
  return map;
}

function mapToProgressList(map: Map<string, IntensiveStatus>): StudentIntensiveProgress[] {
  return [...map.entries()].map(([key, status]) => {
    const { studentId, intensiveId } = parseProgressKey(key);
    return { studentId, intensiveId, status };
  });
}

function shouldPersistIntensivesToSupabase(
  dataSource: IntensivesDataSource,
  studentPortalToken?: string,
): boolean {
  if (studentPortalToken) {
    return false;
  }

  if (shouldUseSupabaseForIntensives()) {
    return true;
  }

  return dataSource === 'supabase';
}

export function IntensivesProvider({
  children,
  initialIntensives,
  initialProgress,
  studentPortalToken,
}: {
  children: React.ReactNode;
  initialIntensives: Intensive[];
  initialProgress: StudentIntensiveProgress[];
  studentPortalToken?: string;
}) {
  const [intensives, setIntensives] = useState<Intensive[]>(() =>
    isStrictSupabaseMode() ? [] : initialIntensives,
  );
  const [progressMap, setProgressMap] = useState<Map<string, IntensiveStatus>>(() =>
    isStrictSupabaseMode()
      ? new Map()
      : buildProgressMap(initialProgress),
  );
  const [loadState, setLoadState] = useState<CrmLoadState>(
    getStrictSupabaseInitialLoadState,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydrated = isCrmEntityHydrated(loadState);
  const dataSourceRef = useRef<IntensivesDataSource>('localStorage');
  const progressPersistChainsRef = useRef(new Map<string, Promise<void>>());
  const progressMutationVersionsRef = useRef(new Map<string, number>());

  useEffect(() => {
    let cancelled = false;

    async function hydrateIntensives() {
      const usePortalApi = Boolean(studentPortalToken);
      const result = await hydrateMigratedEntity({
        entityLabel: 'intensives',
        useSupabase: usePortalApi || shouldUseSupabaseForIntensives(),
        fetchFromSupabase: usePortalApi
          ? () => fetchStudentPortalIntensivesBundle(studentPortalToken!)
          : fetchIntensivesBundleFromSupabase,
        readLocalFallback: () =>
          isStrictSupabaseMode()
            ? { intensives: [], progress: [] }
            : readIntensivesFromLocalStorage(initialIntensives, initialProgress),
        readLocalSeedSource: () =>
          readIntensivesFromLocalStorage(initialIntensives, initialProgress),
        seedToSupabase: usePortalApi ? undefined : seedIntensivesBundleToSupabase,
        getLength: (data) => data.intensives.length,
      });

      if (cancelled) {
        return;
      }

      if (result.status === 'error') {
        setIntensives([]);
        setProgressMap(new Map());
        setLoadState('error');
        setLoadError(result.error);
        dataSourceRef.current = 'localStorage';
        return;
      }

      setIntensives(result.data.intensives);
      setProgressMap(buildProgressMap(result.data.progress));
      dataSourceRef.current = studentPortalToken
        ? 'student-portal'
        : result.source;
      setLoadState('ready');
      setLoadError(null);
    }

    void hydrateIntensives();

    return () => {
      cancelled = true;
    };
  }, [initialIntensives, initialProgress, studentPortalToken]);

  useEffect(() => {
    if (
      !hydrated ||
      dataSourceRef.current !== 'localStorage' ||
      !shouldFallbackMigratedEntityToLocalStorage()
    ) {
      return;
    }

    writeIntensivesToLocalStorage({
      intensives,
      progress: mapToProgressList(progressMap),
    });
  }, [intensives, progressMap, hydrated]);

  const getStatus = useCallback(
    (studentId: string, intensiveId: string): IntensiveStatus =>
      progressMap.get(progressKey(studentId, intensiveId)) ?? 'not_started',
    [progressMap],
  );

  const cycleStatus = useCallback((studentId: string, intensiveId: string) => {
    const key = progressKey(studentId, intensiveId);
    let previousStatus: IntensiveStatus = 'not_started';
    let nextStatus: IntensiveStatus = 'not_started';

    setProgressMap((current) => {
      const next = new Map(current);
      previousStatus = next.get(key) ?? 'not_started';
      nextStatus = cycleIntensiveStatus(previousStatus);

      if (nextStatus === 'not_started') {
        next.delete(key);
      } else {
        next.set(key, nextStatus);
      }

      return next;
    });

    if (!shouldPersistIntensivesToSupabase(dataSourceRef.current, studentPortalToken)) {
      return;
    }

    const mutationVersion = (progressMutationVersionsRef.current.get(key) ?? 0) + 1;
    progressMutationVersionsRef.current.set(key, mutationVersion);

    const previousChain =
      progressPersistChainsRef.current.get(key) ?? Promise.resolve();

    const nextChain = previousChain
      .catch(() => undefined)
      .then(async () => {
        const result = await updateStudentIntensiveProgressInSupabase(
          studentId,
          intensiveId,
          nextStatus,
        );

        if (progressMutationVersionsRef.current.get(key) !== mutationVersion) {
          return;
        }

        if (result.ok) {
          return;
        }

        console.error(
          '[intensives] Supabase progress update failed:',
          result.error,
        );
        setProgressMap((current) => {
          const revert = new Map(current);

          if (previousStatus === 'not_started') {
            revert.delete(key);
          } else {
            revert.set(key, previousStatus);
          }

          return revert;
        });
      });

    progressPersistChainsRef.current.set(key, nextChain);
  }, [studentPortalToken]);

  const addIntensive = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newIntensive: Intensive = {
      id: generateIntensiveId(),
      title: trimmed,
    };

    setIntensives((current) => [...current, newIntensive]);

    if (!shouldPersistIntensivesToSupabase(dataSourceRef.current, studentPortalToken)) {
      return;
    }

    void insertIntensiveToSupabase(newIntensive).then((result) => {
      if (result.ok) {
        setIntensives((current) =>
          current.map((item) =>
            item.id === newIntensive.id ? result.data : item,
          ),
        );
        return;
      }

      console.error('[intensives] Supabase insert failed:', result.error);
      setIntensives((current) =>
        current.filter((item) => item.id !== newIntensive.id),
      );
    });
  }, [studentPortalToken]);

  const getStudentIntensives = useCallback(
    (studentId: string) =>
      intensives
        .map((intensive) => ({
          intensive,
          status: getStatus(studentId, intensive.id),
        }))
        .filter(
          (entry) =>
            entry.status === 'in_progress' || entry.status === 'completed',
        ),
    [intensives, getStatus],
  );

  const value = useMemo(
    () => ({
      intensives,
      hydrated,
      loadState,
      loadError,
      getStatus,
      cycleStatus,
      addIntensive,
      getStudentIntensives,
    }),
    [
      intensives,
      hydrated,
      loadState,
      loadError,
      getStatus,
      cycleStatus,
      addIntensive,
      getStudentIntensives,
    ],
  );

  return (
    <IntensivesContext.Provider value={value}>
      {children}
    </IntensivesContext.Provider>
  );
}

export function useIntensives() {
  const context = useContext(IntensivesContext);
  if (!context) {
    throw new Error('useIntensives must be used within IntensivesProvider');
  }
  return context;
}

export function sortStudentsByName(students: Student[]): Student[] {
  return [...students].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}
