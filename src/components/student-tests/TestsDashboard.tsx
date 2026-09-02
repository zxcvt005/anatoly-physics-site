'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { useTestsData } from '@/components/student-tests/TestsDataProvider';
import { HomeworkTestCard } from '@/components/student-tests/HomeworkTestCard';
import { TestsStatCard } from '@/components/student-tests/TestsStatCard';
import {
  buildSessionSearchParams,
} from '@/lib/tests/student-homework-ui';
import {
  computeStudentHomeworkStats,
  getActiveHomeworkItems,
  getCurrentLessonHomework,
  getRecentHomeworkResults,
} from '@/lib/tests/student-homework-stats';
import { testsSessionPath } from '@/lib/tests/student-navigation';
import { formatDateShort } from '@/lib/tutor-calculations';

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value)}%`;
}

export function TestsDashboard() {
  const { token, homework, loading, loadError, reload } = useTestsData();
  const [dismissToast, setDismissToast] = useState<string | null>(null);

  const stats = computeStudentHomeworkStats(homework);
  const recentResults = getRecentHomeworkResults(homework);
  const activeItems = getActiveHomeworkItems(homework);
  const currentHomework = getCurrentLessonHomework(homework);

  const handleDismiss = useCallback(
    async (assignmentId: string) => {
      const response = await fetch(
        `/api/student/${token}/tests/assignments/${assignmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dismissed: true }),
        },
      );
      const body = (await response.json()) as { ok: boolean; error?: string };

      if (!body.ok) {
        throw new Error(body.error ?? 'Не удалось убрать задание');
      }

      await reload();
      setDismissToast('Задание убрано из списка');
      window.setTimeout(() => setDismissToast(null), 3000);
    },
    [reload, token],
  );

  if (loading) {
    return <p className="text-sm text-zinc-500">Загрузка...</p>;
  }

  if (loadError) {
    return <p className="text-sm text-red-400">{loadError}</p>;
  }

  const currentSessionHref =
    currentHomework?.testId
      ? `${testsSessionPath(token)}?${buildSessionSearchParams({
          testId: currentHomework.testId,
          attemptId:
            currentHomework.status === 'in_progress'
              ? currentHomework.attemptId
              : undefined,
          assignmentId: currentHomework.assignmentId,
          source: 'lesson',
          title: currentHomework.topicTitle,
        }).toString()}`
      : null;

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-10 sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#3166F0]/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#3166F0]/10 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-400">
            Тесты
          </p>
          <h1 className="mb-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            Мой прогресс
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Домашние тесты по темам занятий. Проходите назначенные задания и
            возвращайтесь к пройденным темам.
          </p>
        </div>
      </section>

      {currentHomework && currentSessionHref && (
        <section className="rounded-2xl border border-[#3166F0]/30 bg-[#3166F0]/10 p-5 backdrop-blur-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9eb6ff]">
            Актуальное ДЗ
          </p>
          <p className="mt-2 text-xl font-bold text-white sm:text-2xl">
            {currentHomework.topicTitle}
          </p>
          {currentHomework.lessonDate && (
            <p className="mt-1 text-sm text-zinc-300">
              После занятия {formatDateShort(currentHomework.lessonDate)}
            </p>
          )}
          <Link
            href={currentSessionHref}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#3166F0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2856d4]"
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
          </Link>
        </section>
      )}

      <section>
        <h2 className="mb-5 text-xl font-bold sm:text-2xl">Общая статистика</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TestsStatCard
            value={String(stats.completed)}
            label="Пройдено"
          />
          <TestsStatCard
            value={formatPercent(stats.avgPercent)}
            label="Средний результат"
          />
          <TestsStatCard
            value={formatPercent(stats.bestPercent)}
            label="Лучший результат"
          />
          <TestsStatCard
            value={String(stats.assigned)}
            label="Назначено"
            accent
          />
          <TestsStatCard
            value={String(stats.inProgress)}
            label="В процессе"
          />
          <TestsStatCard
            value={formatPercent(stats.completionRate)}
            label="Процент выполнения"
          />
        </div>
      </section>

      {recentResults.length > 0 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 backdrop-blur-sm sm:p-6">
          <h2 className="mb-5 text-xl font-bold sm:text-2xl">Последние результаты</h2>
          <div className="divide-y divide-zinc-800">
            {recentResults.map((item) => (
              <div
                key={item.topicId}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{item.topicTitle}</p>
                  {item.sectionTitle && (
                    <p className="truncate text-xs text-zinc-500">{item.sectionTitle}</p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-semibold text-[#9eb6ff]">
                  {item.finalPercent !== undefined
                    ? `${Math.round(item.finalPercent)}%`
                    : '—'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {dismissToast && (
        <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 shadow-lg">
          {dismissToast}
        </p>
      )}

      {activeItems.length > 0 && (
        <section>
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">Активные тесты</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Назначенные и незавершённые задания
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeItems.slice(0, 4).map((item) => (
              <HomeworkTestCard
                key={item.assignmentId ?? item.topicId}
                token={token}
                item={item}
                sectionTitle={item.sectionTitle}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
