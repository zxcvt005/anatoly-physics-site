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
  fetchLessonsFromSupabase,
  seedLessonsToSupabase,
  upsertLessonsToSupabase,
  deleteLessonFromSupabase,
} from '@/lib/crm/api/lessons';
import { fetchStudentPortalLessons } from '@/lib/crm/api/student-portal';
import { getMaterializedLessonIdFromSlotItem } from '@/lib/lesson-marking';
import { pruneOrphanScheduledRegularLessons } from '@/lib/lesson-orphans';
import { applyTransferToLessons } from '@/lib/lesson-transfer';
import {
  collectChangedPersistableLessons,
  collectDeletedPersistableLessonIds,
  isPersistableLesson,
} from '@/lib/lessons/persist';
import {
  readLessonsFromLocalStorage,
  writeLessonsToLocalStorage,
} from '@/lib/lessons/local-storage';
import {
  combineDateAndTime,
  generateLessonId,
  getLocalDateKey,
  isLessonChargeable,
  isLessonOnLocalDate,
  normalizeLesson,
} from '@/lib/lesson-utils';
import { shouldUseSupabaseForLessons } from '@/lib/supabase/env';
import {
  isEditableOneOffLesson,
  oneOffInputToLessonPatch,
} from '@/lib/one-off-lesson';
import type {
  AssistantMarkingData,
  AssistantTodayItem,
  Lesson,
  OneOffLessonInput,
  TransferLessonInput,
} from '@/types/tutor';

type LessonsDataSource = 'supabase' | 'localStorage' | 'student-portal';

interface LessonsContextValue {
  lessons: Lesson[];
  hydrated: boolean;
  loadState: CrmLoadState;
  loadError: string | null;
  addOneOffLesson: (input: OneOffLessonInput) => Lesson;
  updateOneOffLesson: (lessonId: string, input: OneOffLessonInput) => Lesson | null;
  deleteOneOffLesson: (lessonId: string) => boolean;
  applyLessonMarking: (
    lessonId: string,
    marking: AssistantMarkingData,
  ) => void;
  markTodayLesson: (
    item: AssistantTodayItem,
    marking: AssistantMarkingData,
  ) => string;
  transferLesson: (
    sourceLessonId: string,
    input: TransferLessonInput,
  ) => Lesson | null;
  updateLesson: (lessonId: string, patch: Partial<Lesson>) => void;
  getMissedLessonsForStudent: (studentId: string) => Lesson[];
}

const LessonsContext = createContext<LessonsContextValue | null>(null);

function parseTodayItemTimes(item: AssistantTodayItem): {
  startTime: string;
  endTime?: string;
} {
  if (item.timeLabel.includes('–')) {
    const [startTime, endTime] = item.timeLabel.split('–');
    return { startTime, endTime };
  }

  return { startTime: item.timeLabel };
}

function createLessonFromTodayItem(item: AssistantTodayItem): Lesson {
  const { startTime, endTime } = parseTodayItemTimes(item);
  const dateKey = item.dateKey ?? getLocalDateKey();

  return normalizeLesson({
    id: getMaterializedLessonIdFromSlotItem(item),
    studentId: item.studentId,
    date: combineDateAndTime(dateKey, startTime),
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: item.lessonType ?? 'regular',
    isOutsideSchedule: item.isOutsideSchedule ?? false,
    makeupStatus: 'none',
    attendance: 'planned',
    endTime,
    isChargeable: false,
  });
}

function shouldPersistLessonsToSupabase(
  dataSource: LessonsDataSource,
  studentPortalToken?: string,
): boolean {
  if (studentPortalToken) {
    return false;
  }

  if (shouldUseSupabaseForLessons()) {
    return true;
  }

  return dataSource === 'supabase';
}

export function LessonsProvider({
  children,
  initialLessons,
  studentPortalToken,
}: {
  children: React.ReactNode;
  initialLessons: Lesson[];
  studentPortalToken?: string;
}) {
  const [lessons, setLessons] = useState<Lesson[]>(() =>
    isStrictSupabaseMode()
      ? []
      : pruneOrphanScheduledRegularLessons(
          initialLessons.map(normalizeLesson),
        ),
  );
  const [loadState, setLoadState] = useState<CrmLoadState>(
    getStrictSupabaseInitialLoadState,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const hydrated = isCrmEntityHydrated(loadState);
  const dataSourceRef = useRef<LessonsDataSource>('localStorage');
  const persistChainRef = useRef<Promise<void>>(Promise.resolve());
  const lessonsRef = useRef(lessons);

  useEffect(() => {
    lessonsRef.current = lessons;
  }, [lessons]);

  const persistLessonChanges = useCallback(
    (before: Lesson[], after: Lesson[]) => {
      if (!shouldPersistLessonsToSupabase(dataSourceRef.current, studentPortalToken)) {
        return;
      }

      const changed = collectChangedPersistableLessons(before, after);

      if (changed.length === 0) {
        return;
      }

      persistChainRef.current = persistChainRef.current
        .catch(() => undefined)
        .then(async () => {
          const result = await upsertLessonsToSupabase(changed);

          if (result.ok) {
            return;
          }

          console.error('[lessons] Supabase upsert failed:', result.error);
          setLessons(before);
        });
    },
    [studentPortalToken],
  );

  const persistLessonDeletes = useCallback(
    (before: Lesson[], after: Lesson[]) => {
      if (!shouldPersistLessonsToSupabase(dataSourceRef.current, studentPortalToken)) {
        return;
      }

      const deletedIds = collectDeletedPersistableLessonIds(before, after);

      if (deletedIds.length === 0) {
        return;
      }

      persistChainRef.current = persistChainRef.current
        .catch(() => undefined)
        .then(async () => {
          for (const lessonId of deletedIds) {
            const result = await deleteLessonFromSupabase(lessonId);

            if (!result.ok) {
              console.error('[lessons] Supabase delete failed:', result.error);
              setLessons(before);
              return;
            }
          }
        });
    },
    [studentPortalToken],
  );

  const applyLessonsUpdate = useCallback(
    (mutator: (current: Lesson[]) => Lesson[]) => {
      const before = lessonsRef.current;
      const next = mutator(before);

      if (next === before) {
        return;
      }

      lessonsRef.current = next;
      setLessons(next);

      if (hydrated) {
        persistLessonDeletes(before, next);
        persistLessonChanges(before, next);
      }
    },
    [hydrated, persistLessonChanges, persistLessonDeletes],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateLessons() {
      const usePortalApi = Boolean(studentPortalToken);
      const result = await hydrateMigratedEntity({
        entityLabel: 'lessons',
        useSupabase: usePortalApi || shouldUseSupabaseForLessons(),
        fetchFromSupabase: usePortalApi
          ? () => fetchStudentPortalLessons(studentPortalToken!)
          : fetchLessonsFromSupabase,
        readLocalFallback: () =>
          isStrictSupabaseMode()
            ? []
            : readLessonsFromLocalStorage(initialLessons),
        readLocalSeedSource: () => readLessonsFromLocalStorage(initialLessons),
        seedToSupabase: usePortalApi ? undefined : seedLessonsToSupabase,
        getLength: (data) => data.length,
      });

      if (cancelled) {
        return;
      }

      if (result.status === 'error') {
        setLessons([]);
        setLoadState('error');
        setLoadError(result.error);
        dataSourceRef.current = 'localStorage';
        return;
      }

      setLessons(
        pruneOrphanScheduledRegularLessons(
          result.data.map(normalizeLesson),
        ),
      );
      dataSourceRef.current = studentPortalToken
        ? 'student-portal'
        : result.source;
      setLoadState('ready');
      setLoadError(null);
    }

    void hydrateLessons();

    return () => {
      cancelled = true;
    };
  }, [initialLessons, studentPortalToken]);

  useEffect(() => {
    if (
      !hydrated ||
      dataSourceRef.current !== 'localStorage' ||
      !shouldFallbackMigratedEntityToLocalStorage()
    ) {
      return;
    }

    writeLessonsToLocalStorage(lessons);
  }, [lessons, hydrated]);

  const updateLesson = useCallback(
    (lessonId: string, patch: Partial<Lesson>) => {
      applyLessonsUpdate((current) =>
        current.map((lesson) =>
          lesson.id === lessonId
            ? normalizeLesson({ ...lesson, ...patch })
            : lesson,
        ),
      );
    },
    [applyLessonsUpdate],
  );

  const getMissedLessonsForStudent = useCallback(
    (studentId: string) =>
      lessons.filter(
        (lesson) =>
          lesson.studentId === studentId &&
          lesson.status === 'completed' &&
          lesson.attendance === 'absent' &&
          lesson.makeupStatus !== 'completed',
      ),
    [lessons],
  );

  const addOneOffLesson = useCallback(
    (input: OneOffLessonInput) => {
      const newLesson: Lesson = normalizeLesson({
        id: generateLessonId(),
        studentId: input.studentId,
        date: combineDateAndTime(input.date, input.time),
        status: 'scheduled',
        paymentStatus: 'unpaid',
        lessonType: input.type,
        isOutsideSchedule: true,
        makeupForLessonId: input.makeupForLessonId,
        makeupStatus: 'none',
        topic: input.topic,
        comment: input.comment,
        endTime: input.endTime,
        attendance: 'planned',
        isChargeable: false,
      });

      applyLessonsUpdate((current) => {
        let next = [...current, newLesson];

        if (input.type === 'makeup' && input.makeupForLessonId) {
          next = next.map((lesson) =>
            lesson.id === input.makeupForLessonId
              ? { ...lesson, makeupStatus: 'scheduled' as const }
              : lesson,
          );
        }

        return next;
      });

      return newLesson;
    },
    [applyLessonsUpdate],
  );

  function applyMakeupLinkSideEffects(
    lessons: Lesson[],
    previousMakeupForId: string | undefined,
    nextMakeupForId: string | undefined,
  ): Lesson[] {
    let next = lessons;

    if (
      previousMakeupForId &&
      previousMakeupForId !== nextMakeupForId
    ) {
      next = next.map((lesson) =>
        lesson.id === previousMakeupForId
          ? { ...lesson, makeupStatus: 'none' as const }
          : lesson,
      );
    }

    if (nextMakeupForId) {
      next = next.map((lesson) =>
        lesson.id === nextMakeupForId
          ? { ...lesson, makeupStatus: 'scheduled' as const }
          : lesson,
      );
    }

    return next;
  }

  const updateOneOffLesson = useCallback(
    (lessonId: string, input: OneOffLessonInput) => {
      let updatedLesson: Lesson | null = null;

      applyLessonsUpdate((current) => {
        const existing = current.find((lesson) => lesson.id === lessonId);
        if (!existing || !isEditableOneOffLesson(existing)) {
          return current;
        }

        const patch = oneOffInputToLessonPatch(
          existing,
          input,
          combineDateAndTime,
        );
        const nextLesson = normalizeLesson({ ...existing, ...patch });

        updatedLesson = nextLesson;

        let next = current.map((lesson) =>
          lesson.id === lessonId ? nextLesson : lesson,
        );

        next = applyMakeupLinkSideEffects(
          next,
          existing.makeupForLessonId,
          nextLesson.lessonType === 'makeup'
            ? nextLesson.makeupForLessonId
            : undefined,
        );

        return next;
      });

      return updatedLesson;
    },
    [applyLessonsUpdate],
  );

  const deleteOneOffLesson = useCallback(
    (lessonId: string) => {
      let removed = false;

      applyLessonsUpdate((current) => {
        const existing = current.find((lesson) => lesson.id === lessonId);
        if (!existing || !isEditableOneOffLesson(existing)) {
          return current;
        }

        removed = true;

        let next = current.filter((lesson) => lesson.id !== lessonId);

        if (existing.lessonType === 'makeup' && existing.makeupForLessonId) {
          next = next.map((lesson) =>
            lesson.id === existing.makeupForLessonId
              ? { ...lesson, makeupStatus: 'none' as const }
              : lesson,
          );
        }

        return next;
      });

      return removed;
    },
    [applyLessonsUpdate],
  );

  const transferLesson = useCallback(
    (sourceLessonId: string, input: TransferLessonInput) => {
      let createdLesson: Lesson | null = null;

      applyLessonsUpdate((current) => {
        const source = current.find((lesson) => lesson.id === sourceLessonId);
        if (!source) return current;

        const next = applyTransferToLessons(current, sourceLessonId, input);
        createdLesson =
          next.find(
            (lesson) =>
              lesson.transferredFromLessonId === sourceLessonId &&
              lesson.status === 'scheduled',
          ) ?? null;

        return next;
      });

      return createdLesson;
    },
    [applyLessonsUpdate],
  );

  const applyLessonMarking = useCallback(
    (lessonId: string, marking: AssistantMarkingData) => {
      if (lessonId.startsWith('slot-') || lessonId.startsWith('gen-')) {
        return;
      }

      applyLessonsUpdate((current) => {
        const target = current.find((lesson) => lesson.id === lessonId);
        if (!target) return current;

        if (marking.isTransferred && marking.transfer) {
          return applyTransferToLessons(current, lessonId, marking.transfer);
        }

        const completedLesson: Lesson = normalizeLesson({
          ...target,
          status: 'completed',
          attendance: marking.wasPresent ? 'present' : 'absent',
          isChargeable: marking.wasPresent,
          paymentStatus: marking.wasPresent ? 'paid' : target.paymentStatus,
          topic: marking.wasPresent
            ? marking.topic ?? target.topic
            : target.topic,
          homeworkStatus: marking.wasPresent
            ? marking.homeworkDone
              ? 'done'
              : 'not_done'
            : undefined,
          homeworkScore:
            marking.wasPresent && marking.homeworkDone
              ? marking.homeworkScore
              : undefined,
        });

        let next = current.map((lesson) =>
          lesson.id === lessonId ? completedLesson : lesson,
        );

        if (
          marking.wasPresent &&
          target.lessonType === 'makeup' &&
          target.makeupForLessonId
        ) {
          next = next.map((lesson) =>
            lesson.id === target.makeupForLessonId
              ? { ...lesson, makeupStatus: 'completed' as const }
              : lesson,
          );
        }

        return next;
      });
    },
    [applyLessonsUpdate],
  );

  const markTodayLesson = useCallback(
    (item: AssistantTodayItem, marking: AssistantMarkingData): string => {
      let resolvedLessonId = item.lessonId;

      applyLessonsUpdate((current) => {
        let working = current;
        let lessonId = item.lessonId;

        if (lessonId.startsWith('slot-')) {
          const materializedId = getMaterializedLessonIdFromSlotItem(item);
          const existingMaterialized = working.find(
            (lesson) => lesson.id === materializedId,
          );

          if (existingMaterialized) {
            lessonId = existingMaterialized.id;
          } else {
            const created = createLessonFromTodayItem(item);
            working = [...working, created];
            lessonId = created.id;
          }
        }

        resolvedLessonId = lessonId;

        const target = working.find((lesson) => lesson.id === lessonId);
        if (!target) return working;

        if (marking.isTransferred && marking.transfer) {
          return applyTransferToLessons(working, lessonId, marking.transfer);
        }

        const completedLesson: Lesson = normalizeLesson({
          ...target,
          status: 'completed',
          attendance: marking.wasPresent ? 'present' : 'absent',
          isChargeable: marking.wasPresent,
          paymentStatus: marking.wasPresent ? 'paid' : target.paymentStatus,
          topic: marking.wasPresent
            ? marking.topic ?? target.topic
            : target.topic,
          homeworkStatus: marking.wasPresent
            ? marking.homeworkDone
              ? 'done'
              : 'not_done'
            : undefined,
          homeworkScore:
            marking.wasPresent && marking.homeworkDone
              ? marking.homeworkScore
              : undefined,
        });

        let next = working.map((lesson) =>
          lesson.id === lessonId ? completedLesson : lesson,
        );

        if (
          marking.wasPresent &&
          target.lessonType === 'makeup' &&
          target.makeupForLessonId
        ) {
          next = next.map((lesson) =>
            lesson.id === target.makeupForLessonId
              ? { ...lesson, makeupStatus: 'completed' as const }
              : lesson,
          );
        }

        return next;
      });

      return resolvedLessonId;
    },
    [applyLessonsUpdate],
  );

  const value = useMemo(
    () => ({
      lessons,
      hydrated,
      loadState,
      loadError,
      addOneOffLesson,
      updateOneOffLesson,
      deleteOneOffLesson,
      applyLessonMarking,
      markTodayLesson,
      transferLesson,
      updateLesson,
      getMissedLessonsForStudent,
    }),
    [
      lessons,
      hydrated,
      loadState,
      loadError,
      addOneOffLesson,
      updateOneOffLesson,
      deleteOneOffLesson,
      applyLessonMarking,
      markTodayLesson,
      transferLesson,
      updateLesson,
      getMissedLessonsForStudent,
    ],
  );

  return (
    <LessonsContext.Provider value={value}>{children}</LessonsContext.Provider>
  );
}

export function useLessons() {
  const context = useContext(LessonsContext);
  if (!context) {
    throw new Error('useLessons must be used within LessonsProvider');
  }
  return context;
}

export function getLessonsForStudentFromList(
  lessons: Lesson[],
  studentId: string,
): Lesson[] {
  return lessons
    .filter((lesson) => lesson.studentId === studentId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getLessonsForTodayFromList(lessons: Lesson[]): Lesson[] {
  return lessons
    .filter(
      (lesson) =>
        isLessonOnLocalDate(lesson.date) &&
        lesson.status === 'scheduled' &&
        isPersistableLesson(lesson),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export { isLessonChargeable };
