'use client';

import { useEffect, useMemo, useState } from 'react';
import { MockExamsChart } from '@/components/tutor/MockExamsChart';
import {
  buildStudentMockExamViews,
  computeStudentMockExamStats,
  formatScorePercent,
} from '@/lib/mock-exams/calculations';
import type { MockExam, MockExamResult } from '@/lib/mock-exams/types';

type StudentMockExamsSectionProps = {
  token: string;
  className?: string;
};

type StudentMockExamsPayload = {
  studentId: string;
  exams: MockExam[];
  results: MockExamResult[];
};

export function StudentMockExamsSection({
  token,
  className = '',
}: StudentMockExamsSectionProps) {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [results, setResults] = useState<MockExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/student/${encodeURIComponent(token)}/mock-exams`,
        );
        const body = (await response.json()) as {
          ok: boolean;
          error?: string;
          data?: StudentMockExamsPayload;
        };

        if (cancelled) {
          return;
        }

        if (!response.ok || !body.ok || !body.data) {
          setError(body.error ?? 'Не удалось загрузить пробники');
          setIsLoading(false);
          return;
        }

        setExams(body.data.exams);
        setResults(body.data.results);
        setIsLoading(false);
      } catch {
        if (!cancelled) {
          setError('Не удалось загрузить пробники');
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const views = useMemo(
    () => buildStudentMockExamViews(exams, results),
    [exams, results],
  );
  const stats = useMemo(() => computeStudentMockExamStats(views), [views]);

  return (
    <section
      className={`rounded-2xl border border-zinc-800 bg-zinc-950 px-3.5 py-3.5 md:px-4 md:py-4 ${className}`}
    >
      <h2 className="text-base font-semibold text-white md:text-lg">Пробники</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Динамика результатов пробных экзаменов
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Загрузка…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      ) : views.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
          Пока нет результатов пробников
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-black/30 px-3 py-4 backdrop-blur-sm">
            <MockExamsChart views={views} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
            <StatCard label="Пробников" value={String(stats.count)} />
            <StatCard
              label="Средний результат"
              value={
                stats.averagePercent === null
                  ? '—'
                  : formatScorePercent(stats.averagePercent)
              }
            />
            <StatCard
              label="Лучший результат"
              value={
                stats.bestPercent === null
                  ? '—'
                  : formatScorePercent(stats.bestPercent)
              }
            />
            <StatCard
              label="Последний результат"
              value={
                stats.latestPercent === null
                  ? '—'
                  : formatScorePercent(stats.latestPercent)
              }
            />
          </div>
        </>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
