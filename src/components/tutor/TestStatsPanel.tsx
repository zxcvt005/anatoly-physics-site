'use client';

import { useEffect, useState } from 'react';
import { fetchTopicTestStats } from '@/lib/crm/api/tests';
import type { TopicTestStats } from '@/types/tests';

interface TestStatsPanelProps {
  entityId: string;
  title: string;
}

export function TestStatsPanel({ entityId, title }: TestStatsPanelProps) {
  const [stats, setStats] = useState<TopicTestStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const result = await fetchTopicTestStats(entityId);

      if (!cancelled) {
        setLoading(false);
        if (result.ok) setStats(result.data);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Загрузка статистики...</p>;
  }

  if (!stats) {
    return <p className="text-sm text-zinc-500">Статистика недоступна</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-zinc-500">Статистика прохождений</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Проходили" value={String(stats.studentsAttempted)} />
        <StatCard label="Завершили" value={String(stats.studentsCompleted)} />
        <StatCard
          label="Средний % (1 попытка)"
          value={
            stats.avgFirstAttemptPercent !== null
              ? `${stats.avgFirstAttemptPercent}%`
              : '—'
          }
        />
        <StatCard
          label="Средний итоговый %"
          value={stats.avgFinalPercent !== null ? `${stats.avgFinalPercent}%` : '—'}
        />
      </div>

      {stats.questions.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900/80 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3">Вопрос</th>
                <th className="px-4 py-3">Верно с 1-й</th>
                <th className="px-4 py-3">Исправили</th>
                <th className="px-4 py-3">«Не знаю»</th>
              </tr>
            </thead>
            <tbody>
              {stats.questions.map((question) => (
                <tr key={question.questionId} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-zinc-200">{question.promptText}</td>
                  <td className="px-4 py-3">{question.firstAttemptCorrectPercent}%</td>
                  <td className="px-4 py-3">{question.secondAttemptFixedPercent}%</td>
                  <td className="px-4 py-3">{question.unknownPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.studentResults.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900/80 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3">Ученик</th>
                <th className="px-4 py-3">1 попытка</th>
                <th className="px-4 py-3">Итог</th>
              </tr>
            </thead>
            <tbody>
              {stats.studentResults.map((row) => (
                <tr key={row.studentId} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-zinc-200">{row.studentName}</td>
                  <td className="px-4 py-3">
                    {row.firstAttemptCorrect ?? '—'} / {row.firstAttemptTotal ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.finalScore ?? '—'} / {row.finalMaxScore ?? '—'}
                    {row.finalPercent !== undefined ? ` (${row.finalPercent}%)` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
