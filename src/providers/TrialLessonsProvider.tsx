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
  fetchTrialLessonsFromSupabase,
  insertTrialLessonToSupabase,
  seedTrialLessonsToSupabase,
  updateTrialLessonInSupabase,
} from '@/lib/crm/api/trial-lessons';
import type { TrialLessonFormInput } from '@/lib/trial-lessons/form';
import {
  readTrialLessonsFromLocalStorage,
  writeTrialLessonsToLocalStorage,
} from '@/lib/trial-lessons/local-storage';
import { generateTrialLessonId } from '@/lib/trial-lesson-utils';
import { shouldUseSupabaseForTrialLessons } from '@/lib/supabase/env';
import type { TrialLesson } from '@/types/tutor';

export type { TrialLessonFormInput } from '@/lib/trial-lessons/form';

type TrialLessonsDataSource = 'supabase' | 'localStorage';

interface TrialLessonsContextValue {
  trialLessons: TrialLesson[];
  hydrated: boolean;
  loadState: CrmLoadState;
  loadError: string | null;
  addTrialLesson: (input: TrialLessonFormInput) => TrialLesson;
  updateTrialLesson: (trialId: string, input: TrialLessonFormInput) => void;
}

const TrialLessonsContext = createContext<TrialLessonsContextValue | null>(null);

function buildTrialLesson(
  id: string,
  input: TrialLessonFormInput,
  existing?: TrialLesson,
): TrialLesson {
  return {
    id,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    trialDate: input.trialDate,
    gradeClass: input.gradeClass.trim(),
    goal: input.goal.trim(),
    currentResult: input.currentResult.trim(),
    proposedRate4Weeks: input.proposedRate4Weeks,
    proposedLessonsPerWeek: input.proposedLessonsPerWeek,
    parentContacts: input.parentContacts.trim(),
    callStatus: input.callStatus ?? existing?.callStatus ?? 'not_called',
    comment: input.comment?.trim() || undefined,
    linkedStudentId: input.linkedStudentId ?? existing?.linkedStudentId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

export function TrialLessonsProvider({
  children,
  initialTrialLessons,
}: {
  children: React.ReactNode;
  initialTrialLessons: TrialLesson[];
}) {
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>(() =>
    isStrictSupabaseMode() ? [] : initialTrialLessons,
  );
  const [loadState, setLoadState] = useState<CrmLoadState>(
    getStrictSupabaseInitialLoadState,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydrated = isCrmEntityHydrated(loadState);
  const dataSourceRef = useRef<TrialLessonsDataSource>('localStorage');

  useEffect(() => {
    let cancelled = false;

    async function hydrateTrialLessons() {
      const result = await hydrateMigratedEntity({
        entityLabel: 'trial-lessons',
        useSupabase: shouldUseSupabaseForTrialLessons(),
        fetchFromSupabase: fetchTrialLessonsFromSupabase,
        readLocalFallback: () =>
          isStrictSupabaseMode()
            ? []
            : readTrialLessonsFromLocalStorage(initialTrialLessons),
        readLocalSeedSource: () =>
          readTrialLessonsFromLocalStorage(initialTrialLessons),
        seedToSupabase: seedTrialLessonsToSupabase,
        getLength: (data) => data.length,
      });

      if (cancelled) {
        return;
      }

      if (result.status === 'error') {
        setTrialLessons([]);
        setLoadState('error');
        setLoadError(result.error);
        dataSourceRef.current = 'localStorage';
        return;
      }

      setTrialLessons(result.data);
      dataSourceRef.current = result.source;
      setLoadState('ready');
      setLoadError(null);
    }

    void hydrateTrialLessons();

    return () => {
      cancelled = true;
    };
  }, [initialTrialLessons]);

  useEffect(() => {
    if (
      !hydrated ||
      dataSourceRef.current !== 'localStorage' ||
      !shouldFallbackMigratedEntityToLocalStorage()
    ) {
      return;
    }

    writeTrialLessonsToLocalStorage(trialLessons);
  }, [trialLessons, hydrated]);

  const addTrialLesson = useCallback((input: TrialLessonFormInput) => {
    let createdTrial: TrialLesson | null = null;

    setTrialLessons((current) => {
      const trial = buildTrialLesson(generateTrialLessonId(), {
        ...input,
        callStatus: 'not_called',
      });
      createdTrial = trial;
      return [trial, ...current];
    });

    const trial = createdTrial!;

    if (dataSourceRef.current === 'supabase') {
      void insertTrialLessonToSupabase(trial).then((result) => {
        if (result.ok) {
          setTrialLessons((current) =>
            current.map((item) => (item.id === trial.id ? result.data : item)),
          );
          return;
        }

        console.error('[trial-lessons] Supabase insert failed:', result.error);
        setTrialLessons((current) =>
          current.filter((item) => item.id !== trial.id),
        );
      });
    }

    return trial;
  }, []);

  const updateTrialLesson = useCallback(
    (trialId: string, input: TrialLessonFormInput) => {
      let previousTrial: TrialLesson | undefined;
      let updatedTrial: TrialLesson | undefined;

      setTrialLessons((current) =>
        current.map((trial) => {
          if (trial.id !== trialId) {
            return trial;
          }

          previousTrial = trial;
          updatedTrial = buildTrialLesson(trialId, input, trial);
          return updatedTrial;
        }),
      );

      if (!previousTrial || !updatedTrial) {
        return;
      }

      if (dataSourceRef.current === 'supabase') {
        void updateTrialLessonInSupabase(
          trialId,
          input,
          previousTrial,
        ).then((result) => {
          if (result.ok) {
            setTrialLessons((current) =>
              current.map((item) =>
                item.id === trialId ? result.data : item,
              ),
            );
            return;
          }

          console.error('[trial-lessons] Supabase update failed:', result.error);
          setTrialLessons((current) =>
            current.map((item) =>
              item.id === trialId ? previousTrial! : item,
            ),
          );
        });
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      trialLessons,
      hydrated,
      loadState,
      loadError,
      addTrialLesson,
      updateTrialLesson,
    }),
    [
      trialLessons,
      hydrated,
      loadState,
      loadError,
      addTrialLesson,
      updateTrialLesson,
    ],
  );

  return (
    <TrialLessonsContext.Provider value={value}>
      {children}
    </TrialLessonsContext.Provider>
  );
}

export function useTrialLessons() {
  const context = useContext(TrialLessonsContext);
  if (!context) {
    throw new Error('useTrialLessons must be used within TrialLessonsProvider');
  }
  return context;
}
