'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, ClipboardList, Play, RotateCcw, X } from 'lucide-react';
import { TestTakingFlow } from '@/components/tutor/TestTakingFlow';
import { groupHomeworkBySection } from '@/lib/tests/topic-sections';
import { formatDateShort } from '@/lib/tutor-calculations';
import type {
  StudentHomeworkListItem,
  StudentIntensiveListItem,
} from '@/types/tests';

interface StudentTestsData {
  homework: StudentHomeworkListItem[];
  intensives: StudentIntensiveListItem[];
}

interface ActiveSession {
  testId: string;
  attemptId?: string;
  assignmentId?: string;
  source: 'lesson' | 'self';
  title: string;
  kind: 'homework' | 'intensive';
  viewResult?: boolean;
}

interface StudentHomeworkSectionProps {
  token: string;
}

type CabinetView = 'compact' | 'catalog' | 'taking';

export function StudentHomeworkSection({ token }: StudentHomeworkSectionProps) {
  const [data, setData] = useState<StudentTestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<CabinetView>('compact');
  const [returnView, setReturnView] = useState<'compact' | 'catalog'>('compact');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/student/${token}/tests`, { cache: 'no-store' });
      const body = (await response.json()) as {
        ok: boolean;
        data?: StudentTestsData;
        error?: string;
      };

      if (!body.ok || !body.data) {
        setLoadError(body.error ?? 'Не удалось загрузить тесты');
        setData(null);
      } else {
        setData(body.data);
      }
    } catch {
      setLoadError('Не удалось загрузить тесты');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (view === 'catalog' || view === 'taking') {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [view]);

  const currentHomework = useMemo(() => {
    if (!data) return null;
    return (
      data.homework.find(
        (item) =>
          item.source === 'lesson' &&
          (item.status === 'assigned' || item.status === 'in_progress'),
      ) ?? null
    );
  }, [data]);

  const homeworkGroups = useMemo(() => {
    if (!data) return [];
    return groupHomeworkBySection(data.homework);
  }, [data]);

  const openSession = (session: ActiveSession, from: 'compact' | 'catalog') => {
    setReturnView(from);
    setActiveSession(session);
    setView('taking');
  };

  const closeSession = () => {
    setActiveSession(null);
    setView(returnView);
    void load();
  };

  const closeCatalog = () => {
    setView('compact');
    void load();
  };

  if (view === 'taking' && activeSession) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
        <div className="shrink-0 border-b border-zinc-800 px-4 py-3">
          <p className="truncate text-sm font-medium text-white">{activeSession.title}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <TestTakingFlow
            token={token}
            testId={activeSession.testId}
            attemptId={activeSession.attemptId}
            assignmentId={activeSession.assignmentId}
            source={activeSession.source}
            title={activeSession.title}
            onClose={closeSession}
          />
        </div>
      </div>
    );
  }

  if (view === 'catalog') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
        <header className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <button
            type="button"
            onClick={closeCatalog}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-sm text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-white">
            Тесты
          </h2>
          <button
            type="button"
            onClick={closeCatalog}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white xl:hidden"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading && <p className="text-sm text-zinc-500">Загрузка...</p>}
          {loadError && <p className="text-sm text-red-400">{loadError}</p>}

          {!loading && data && (
            <div className="space-y-6">
              {homeworkGroups.map((group) => (
                <div key={group.sectionId ?? '__unsectioned__'}>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                    {group.sectionTitle}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <HomeworkTestCard
                        key={item.topicId}
                        item={item}
                        onAction={(session) => openSession(session, 'catalog')}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {data.intensives.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
                    Интенсивы
                  </h3>
                  <div className="space-y-2">
                    {data.intensives.map((item) => (
                      <IntensiveTestCard
                        key={item.intensiveId}
                        item={item}
                        onAction={(session) => openSession(session, 'catalog')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-[#3166F0]" />
          <h2 className="text-lg font-semibold text-white">Тесты</h2>
        </div>
        <button
          type="button"
          onClick={() => setView('catalog')}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/60 px-3.5 py-2 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/40 hover:text-white"
        >
          <ClipboardList className="h-4 w-4" />
          Все тесты
        </button>
      </div>

      {loading && (
        <p className="mt-3 text-sm text-zinc-500">Загрузка...</p>
      )}

      {loadError && (
        <p className="mt-3 text-sm text-red-400">{loadError}</p>
      )}

      {!loading && currentHomework && (
        <div className="mt-4 rounded-2xl border border-[#3166F0]/30 bg-[#3166F0]/10 p-4">
          <p className="text-xs uppercase tracking-wide text-[#9eb6ff]">Актуальное ДЗ</p>
          <p className="mt-1 text-lg font-semibold text-white">{currentHomework.topicTitle}</p>
          {currentHomework.lessonDate && (
            <p className="mt-1 text-sm text-zinc-300">
              После занятия {formatDateShort(currentHomework.lessonDate)}
            </p>
          )}
          <p className="mt-2 text-sm text-zinc-400">
            {statusLabel(currentHomework.status, currentHomework.source)}
          </p>
          {currentHomework.testId ? (
            <button
              type="button"
              onClick={() =>
                openSession(
                  {
                    testId: currentHomework.testId!,
                    attemptId:
                      currentHomework.status === 'in_progress'
                        ? currentHomework.attemptId
                        : undefined,
                    assignmentId: currentHomework.assignmentId,
                    source: 'lesson',
                    title: currentHomework.topicTitle,
                    kind: 'homework',
                  },
                  'compact',
                )
              }
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3166F0] px-4 py-2 text-sm font-semibold text-white"
            >
              {currentHomework.status === 'in_progress' ? (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Продолжить
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Открыть тест
                </>
              )}
            </button>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Тест для этой темы пока не опубликован
            </p>
          )}
        </div>
      )}

      {!loading && !currentHomework && !loadError && (
        <p className="mt-3 text-sm text-zinc-500">
          Нет назначенного ДЗ. Откройте «Все тесты», чтобы пройти задание самостоятельно.
        </p>
      )}
    </section>
  );
}

function HomeworkTestCard({
  item,
  onAction,
}: {
  item: StudentHomeworkListItem;
  onAction: (session: ActiveSession) => void;
}) {
  const isAssigned = item.source === 'lesson' && item.status !== 'completed';
  const action = getHomeworkAction(item);

  return (
    <div
      className={`rounded-xl border p-4 ${
        isAssigned
          ? 'border-[#3166F0]/40 bg-[#3166F0]/10'
          : 'border-zinc-800 bg-zinc-950/60'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-white">{item.topicTitle}</p>
            {isAssigned && (
              <span className="inline-flex shrink-0 rounded-md border border-[#3166F0]/40 bg-[#3166F0]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9eb6ff]">
                Назначено
              </span>
            )}
            {item.source === 'lesson' && item.status !== 'assigned' && item.status !== 'in_progress' && (
              <span className="inline-flex shrink-0 rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                ДЗ после урока
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {statusLabel(item.status, item.source)}
            {item.finalPercent !== undefined
              ? ` · ${item.finalScore}/${item.finalMaxScore} (${Math.round(item.finalPercent)}%)`
              : ''}
          </p>
          {item.lessonDate && item.source === 'lesson' && (
            <p className="mt-1 text-xs text-zinc-400">
              Занятие {formatDateShort(item.lessonDate)}
            </p>
          )}
        </div>

        {item.testId && action && (
          <button
            type="button"
            onClick={() =>
              onAction({
                testId: item.testId!,
                attemptId: action.attemptId,
                assignmentId: item.assignmentId,
                source: item.source ?? 'self',
                title: item.topicTitle,
                kind: 'homework',
                viewResult: action.viewResult,
              })
            }
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium ${
              isAssigned
                ? 'bg-[#3166F0] text-white'
                : 'border border-zinc-700 text-zinc-200'
            }`}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function IntensiveTestCard({
  item,
  onAction,
}: {
  item: StudentIntensiveListItem;
  onAction: (session: ActiveSession) => void;
}) {
  const action = getIntensiveAction(item);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-white">{item.intensiveTitle}</p>
          <p className="text-xs text-zinc-500">
            {item.status === 'completed'
              ? `Выполнено · ${item.finalScore}/${item.finalMaxScore} (${Math.round(item.finalPercent ?? 0)}%)`
              : item.status === 'in_progress'
                ? 'Начато'
                : 'Не проходилось'}
          </p>
        </div>
        {item.testId && action && (
          <button
            type="button"
            onClick={() =>
              onAction({
                testId: item.testId!,
                attemptId: action.attemptId,
                source: 'self',
                title: item.intensiveTitle,
                kind: 'intensive',
                viewResult: action.viewResult,
              })
            }
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function getHomeworkAction(item: StudentHomeworkListItem): {
  label: string;
  attemptId?: string;
  viewResult?: boolean;
} | null {
  if (!item.testId) return null;

  if (item.status === 'completed') {
    return {
      label: 'Посмотреть результат',
      attemptId: item.attemptId,
      viewResult: true,
    };
  }

  if (item.status === 'in_progress') {
    return {
      label: 'Продолжить',
      attemptId: item.attemptId,
    };
  }

  return { label: 'Начать' };
}

function getIntensiveAction(item: StudentIntensiveListItem): {
  label: string;
  attemptId?: string;
  viewResult?: boolean;
} | null {
  if (!item.testId) return null;

  if (item.status === 'completed') {
    return {
      label: 'Посмотреть результат',
      attemptId: item.attemptId,
      viewResult: true,
    };
  }

  if (item.status === 'in_progress') {
    return {
      label: 'Продолжить',
      attemptId: item.attemptId,
    };
  }

  return { label: 'Начать' };
}

function statusLabel(
  status: StudentHomeworkListItem['status'],
  source?: StudentHomeworkListItem['source'],
) {
  if (status === 'assigned') return source === 'lesson' ? 'Назначено' : 'Доступно';
  if (status === 'in_progress') return 'Начато';
  if (status === 'completed') return 'Выполнено';
  return 'Не проходилось';
}
