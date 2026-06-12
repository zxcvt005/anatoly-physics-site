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
  readScheduleSlotsFromLocalStorage,
  writeScheduleSlotsToLocalStorage,
} from '@/lib/schedule-slots/local-storage';
import {
  generateSlotId,
  getSlotsForWeekdayFromList,
  sortSlotsByStartTime,
} from '@/lib/schedule-utils';
import { shouldUseSupabaseForScheduleSlots } from '@/lib/supabase/env';
import { fetchStudentPortalScheduleSlots } from '@/lib/crm/api/student-portal';
import {
  deleteScheduleSlotFromSupabase,
  fetchScheduleSlotsFromSupabase,
  insertScheduleSlotToSupabase,
  seedScheduleSlotsToSupabase,
  updateScheduleSlotInSupabase,
} from '@/lib/crm/api/schedule-slots';
import type { WeeklyScheduleSlot } from '@/types/tutor';

export type WeeklyScheduleSlotInput = Omit<WeeklyScheduleSlot, 'id'>;

type ScheduleSlotsDataSource = 'supabase' | 'localStorage' | 'student-portal';

interface ScheduleSlotsContextValue {
  slots: WeeklyScheduleSlot[];
  hydrated: boolean;
  loadState: CrmLoadState;
  loadError: string | null;
  getSlotsForWeekday: (weekday: number) => WeeklyScheduleSlot[];
  updateSlot: (slotId: string, patch: Partial<WeeklyScheduleSlot>) => void;
  addSlot: (slot: WeeklyScheduleSlotInput) => WeeklyScheduleSlot;
  deleteSlot: (slotId: string) => void;
}

const ScheduleSlotsContext = createContext<ScheduleSlotsContextValue | null>(
  null,
);

export function ScheduleSlotsProvider({
  children,
  initialSlots,
  studentPortalToken,
}: {
  children: React.ReactNode;
  initialSlots: WeeklyScheduleSlot[];
  studentPortalToken?: string;
}) {
  const normalizedInitialSlots = useMemo(
    () => sortSlotsByStartTime(initialSlots),
    [initialSlots],
  );

  const [slots, setSlots] = useState<WeeklyScheduleSlot[]>(() =>
    isStrictSupabaseMode() ? [] : normalizedInitialSlots,
  );
  const [loadState, setLoadState] = useState<CrmLoadState>(
    getStrictSupabaseInitialLoadState,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydrated = isCrmEntityHydrated(loadState);
  const dataSourceRef = useRef<ScheduleSlotsDataSource>('localStorage');

  useEffect(() => {
    let cancelled = false;

    async function hydrateSlots() {
      const usePortalApi = Boolean(studentPortalToken);
      const result = await hydrateMigratedEntity({
        entityLabel: 'schedule-slots',
        useSupabase: usePortalApi || shouldUseSupabaseForScheduleSlots(),
        fetchFromSupabase: usePortalApi
          ? () => fetchStudentPortalScheduleSlots(studentPortalToken!)
          : fetchScheduleSlotsFromSupabase,
        readLocalFallback: () =>
          isStrictSupabaseMode()
            ? []
            : readScheduleSlotsFromLocalStorage(normalizedInitialSlots),
        readLocalSeedSource: () =>
          readScheduleSlotsFromLocalStorage(normalizedInitialSlots),
        seedToSupabase: usePortalApi ? undefined : seedScheduleSlotsToSupabase,
        getLength: (data) => data.length,
      });

      if (cancelled) {
        return;
      }

      if (result.status === 'error') {
        setSlots([]);
        setLoadState('error');
        setLoadError(result.error);
        dataSourceRef.current = 'localStorage';
        return;
      }

      setSlots(result.data);
      dataSourceRef.current = studentPortalToken ? 'student-portal' : result.source;
      setLoadState('ready');
      setLoadError(null);
    }

    void hydrateSlots();

    return () => {
      cancelled = true;
    };
  }, [normalizedInitialSlots, studentPortalToken]);

  useEffect(() => {
    if (
      !hydrated ||
      dataSourceRef.current !== 'localStorage' ||
      !shouldFallbackMigratedEntityToLocalStorage()
    ) {
      return;
    }

    writeScheduleSlotsToLocalStorage(slots);
  }, [slots, hydrated]);

  const getSlotsForWeekday = useCallback(
    (weekday: number) => getSlotsForWeekdayFromList(slots, weekday),
    [slots],
  );

  const updateSlot = useCallback(
    (slotId: string, patch: Partial<WeeklyScheduleSlot>) => {
      let previousSlot: WeeklyScheduleSlot | undefined;
      let updatedSlot: WeeklyScheduleSlot | undefined;

      setSlots((current) =>
        sortSlotsByStartTime(
          current.map((slot) => {
            if (slot.id !== slotId) {
              return slot;
            }

            previousSlot = slot;
            updatedSlot = {
              ...slot,
              ...patch,
              studentIds: patch.studentIds
                ? [...patch.studentIds]
                : slot.studentIds,
            };
            return updatedSlot;
          }),
        ),
      );

      if (!previousSlot || !updatedSlot) {
        return;
      }

      if (dataSourceRef.current === 'supabase') {
        void updateScheduleSlotInSupabase(
          slotId,
          patch,
          previousSlot,
        ).then((result) => {
          if (result.ok) {
            setSlots((current) =>
              sortSlotsByStartTime(
                current.map((slot) =>
                  slot.id === slotId ? result.data : slot,
                ),
              ),
            );
            return;
          }

          console.error('[schedule-slots] Supabase update failed:', result.error);
          setSlots((current) =>
            sortSlotsByStartTime(
              current.map((slot) =>
                slot.id === slotId ? previousSlot! : slot,
              ),
            ),
          );
        });
      }
    },
    [],
  );

  const addSlot = useCallback((slot: WeeklyScheduleSlotInput) => {
    let createdSlot: WeeklyScheduleSlot | null = null;

    setSlots((current) => {
      const newSlot: WeeklyScheduleSlot = {
        ...slot,
        id: generateSlotId(),
        studentIds: [...slot.studentIds],
      };
      createdSlot = newSlot;
      return sortSlotsByStartTime([...current, newSlot]);
    });

    const slotToCreate = createdSlot!;

    if (dataSourceRef.current === 'supabase') {
      void insertScheduleSlotToSupabase(slotToCreate).then((result) => {
        if (result.ok) {
          setSlots((current) =>
            sortSlotsByStartTime(
              current.map((item) =>
                item.id === slotToCreate.id ? result.data : item,
              ),
            ),
          );
          return;
        }

        console.error('[schedule-slots] Supabase insert failed:', result.error);
        setSlots((current) =>
          sortSlotsByStartTime(
            current.filter((item) => item.id !== slotToCreate.id),
          ),
        );
      });
    }

    return slotToCreate;
  }, []);

  const deleteSlot = useCallback((slotId: string) => {
    let removedSlot: WeeklyScheduleSlot | undefined;

    setSlots((current) => {
      removedSlot = current.find((slot) => slot.id === slotId);
      return current.filter((slot) => slot.id !== slotId);
    });

    if (!removedSlot) {
      return;
    }

    if (dataSourceRef.current === 'supabase') {
      void deleteScheduleSlotFromSupabase(slotId).then((result) => {
        if (result.ok) {
          return;
        }

        console.error('[schedule-slots] Supabase delete failed:', result.error);
        setSlots((current) => {
          if (current.some((slot) => slot.id === slotId)) {
            return current;
          }

          return sortSlotsByStartTime([...current, removedSlot!]);
        });
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      slots,
      hydrated,
      loadState,
      loadError,
      getSlotsForWeekday,
      updateSlot,
      addSlot,
      deleteSlot,
    }),
    [
      slots,
      hydrated,
      loadState,
      loadError,
      getSlotsForWeekday,
      updateSlot,
      addSlot,
      deleteSlot,
    ],
  );

  return (
    <ScheduleSlotsContext.Provider value={value}>
      {children}
    </ScheduleSlotsContext.Provider>
  );
}

export function useScheduleSlots() {
  const context = useContext(ScheduleSlotsContext);
  if (!context) {
    throw new Error('useScheduleSlots must be used within ScheduleSlotsProvider');
  }
  return context;
}
