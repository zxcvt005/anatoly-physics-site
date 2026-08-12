'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Play, RotateCcw } from 'lucide-react';
import { TestTakingFlow } from '@/components/tutor/TestTakingFlow';
import { formatDateShort } from '@/lib/tutor-calculations';
import type {
  StudentHomeworkListItem,
  StudentIntensiveListItem,
} from '@/types/tests';

interface StudentTestsData {
  homework: StudentHomeworkListItem[];
  intensives: StudentIntensiveListItem[];
}

interface StudentHomeworkSectionProps {
  token: string;
}

export function StudentHomeworkSection({ token }: StudentHomeworkSectionProps) {
  const [data, setData] = useState<StudentTestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<{
    testId: string;
    attemptId?: string;
    assignmentId?: string;
    source: 'lesson' | 'self';
    title: string;
    kind: 'homework' | 'intensive';
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/student/${token}/tests`, { cache: 'no-store' });
    const body = (await response.json()) as {
      ok: boolean;
      data?: StudentTestsData;
    };
    setLoading(false);
    if (body.ok && body.data) setData(body.data);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentHomework = useMemo(() => {
    if (!data) return null;
    return (
      data.homework.find((item) => item.status === 'assigned' || item.status === 'in_progress') ??
      null
    );
  }, [data]);

  if (activeSession) {
    return (
      <TestTakingFlow
        token={token}
        testId={activeSession.testId}
        attemptId={activeSession.attemptId}
        assignmentId={activeSession.assignmentId}
        source={activeSession.source}
        title={activeSession.title}
        onClose={() => {
          setActiveSession(null);
          void load();
        }}
      />
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <BookOpenCheck className="h-5 w-5 text-[#3166F0]" />
        <h2 className="text-lg font-semibold text-white">Домашние задания / Тесты</h2>
      </div>

      {loading && <p className="text-sm text-zinc-500">Загрузка...</p>}

      {!loading && currentHomework && (
        <div className="mb-6 rounded-2xl border border-[#3166F0]/30 bg-[#3166F0]/10 p-4">
          <p className="text-xs uppercase tracking-wide text-[#9eb6ff]">Актуальное ДЗ</p>
          <p className="mt-1 text-lg font-semibold text-white">{currentHomework.topicTitle}</p>
          {currentHomework.lessonDate && (
            <p className="mt-1 text-sm text-zinc-300">
              Назначено после занятия {formatDateShort(currentHomework.lessonDate)}
            </p>
          )}
          <p className="mt-2 text-sm text-zinc-400">
            Статус: {statusLabel(currentHomework.status, currentHomework.source)}
          </p>
          {currentHomework.testId && (
            <button
              type="button"
              onClick={() =>
                setActiveSession({
                  testId: currentHomework.testId!,
                  attemptId: currentHomework.attemptId,
                  assignmentId: currentHomework.assignmentId,
                  source: currentHomework.source ?? 'lesson',
                  title: currentHomework.topicTitle,
                  kind: 'homework',
                })
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
                  Начать
                </>
              )}
            </button>
          )}
        </div>
      )}

      {!loading && data && (
        <>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Все домашние задания
          </h3>
          <div className="space-y-2">
            {data.homework.map((item) => (
              <div
                key={item.topicId}
                className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{item.topicTitle}</p>
                  <p className="text-xs text-zinc-500">
                    {statusLabel(item.status, item.source)}
                    {item.finalPercent !== undefined
                      ? ` · ${item.finalScore}/${item.finalMaxScore} (${Math.round(item.finalPercent)}%)`
                      : ''}
                  </p>
                </div>
                {item.testId && item.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSession({
                        testId: item.testId!,
                        attemptId: item.attemptId,
                        assignmentId: item.assignmentId,
                        source: item.source ?? 'self',
                        title: item.topicTitle,
                        kind: 'homework',
                      })
                    }
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200"
                  >
                    {item.status === 'in_progress' ? 'Продолжить' : 'Открыть'}
                  </button>
                )}
              </div>
            ))}
          </div>

          <h3 className="mb-3 mt-8 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Интенсивы
          </h3>
          <div className="space-y-2">
            {data.intensives.map((item) => (
              <div
                key={item.intensiveId}
                className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
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
                {item.testId && item.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSession({
                        testId: item.testId!,
                        attemptId: item.attemptId,
                        source: 'self',
                        title: item.intensiveTitle,
                        kind: 'intensive',
                      })
                    }
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200"
                  >
                    {item.status === 'in_progress' ? 'Продолжить' : 'Начать'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
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
