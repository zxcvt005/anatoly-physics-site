'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, ClipboardList, Play, RotateCcw } from 'lucide-react';
import {
  buildSessionSearchParams,
} from '@/lib/tests/student-homework-ui';
import { getCurrentLessonHomework } from '@/lib/tests/student-homework-stats';
import { testsHomePath, testsSessionPath } from '@/lib/tests/student-navigation';
import { formatDateShort } from '@/lib/tutor-calculations';
import type { StudentHomeworkListItem } from '@/types/tests';

interface StudentTestsData {
  homework: StudentHomeworkListItem[];
}

interface StudentHomeworkSectionProps {
  token: string;
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

export function StudentHomeworkSection({ token }: StudentHomeworkSectionProps) {
  const [data, setData] = useState<StudentTestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const currentHomework = useMemo(() => {
    if (!data) return null;
    return getCurrentLessonHomework(data.homework);
  }, [data]);

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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-[#3166F0]" />
          <h2 className="text-lg font-semibold text-white">Тесты</h2>
        </div>
        <Link
          href={testsHomePath(token)}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/60 px-3.5 py-2 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/40 hover:text-white"
        >
          <ClipboardList className="h-4 w-4" />
          Все тесты
        </Link>
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
          {currentSessionHref ? (
            <Link
              href={currentSessionHref}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3166F0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2856d4]"
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
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Тест для этой темы пока не опубликован
            </p>
          )}
        </div>
      )}

      {!loading && !currentHomework && !loadError && (
        <p className="mt-3 text-sm text-zinc-500">
          Нет назначенного ДЗ.{' '}
          <Link
            href={testsHomePath(token)}
            className="text-[#9eb6ff] hover:text-[#3166F0] hover:underline"
          >
            Откройте раздел тестов
          </Link>
          , чтобы пройти задание самостоятельно.
        </p>
      )}
    </section>
  );
}
