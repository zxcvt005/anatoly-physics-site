'use client';

import { useMemo } from 'react';
import { intensiveStudentLabels } from '@/lib/intensive-utils';
import {
  computeStudentProgressStats,
  formatAverageHomeworkScore,
} from '@/lib/student-progress';
import { useIntensives } from '@/providers/IntensivesProvider';
import type { IntensiveStatus, Lesson } from '@/types/tutor';

interface StudentProgressSectionProps {
  studentId: string;
  lessons: Lesson[];
  className?: string;
}

const intensiveBadgeStyles: Record<
  Extract<IntensiveStatus, 'in_progress' | 'completed'>,
  string
> = {
  completed:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  in_progress:
    'border-orange-500/30 bg-orange-500/10 text-orange-400',
};

export function StudentProgressSection({
  studentId,
  lessons,
  className = '',
}: StudentProgressSectionProps) {
  const { getStudentIntensives } = useIntensives();

  const stats = useMemo(
    () => computeStudentProgressStats(lessons),
    [lessons],
  );

  const intensives = getStudentIntensives(studentId);

  return (
    <section
      className={`rounded-2xl border border-zinc-800 bg-zinc-950 px-3.5 py-3.5 md:px-4 md:py-4 ${className}`}
    >
      <h2 className="text-base font-semibold text-white md:text-lg">
        Прогресс ученика
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <MetricCard
          label="Проведено занятий"
          value={String(stats.attendedLessonsCount)}
          accent
        />
        <MetricCard
          label="Средний балл за ДЗ"
          value={formatAverageHomeworkScore(stats.averageHomeworkScore)}
          muted={stats.averageHomeworkScore === null}
        />
        <MetricCard
          label="Не сделано ДЗ"
          value={String(stats.homeworkNotDoneCount)}
          warn={stats.homeworkNotDoneCount > 0}
        />
        <MetricCard
          label="Пропуски"
          value={String(stats.absencesCount)}
          warn={stats.absencesCount > 0}
        />
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Освоенные интенсивы
        </h3>
        {intensives.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Пока нет активных интенсивов
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {intensives.map(({ intensive, status }) => (
              <li
                key={intensive.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm"
              >
                <span className="text-zinc-300">{intensive.title}</span>
                <span
                  className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium ${intensiveBadgeStyles[status as 'in_progress' | 'completed']}`}
                >
                  {intensiveStudentLabels[status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  accent,
  muted,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold leading-tight ${
          warn
            ? 'text-red-400'
            : accent
              ? 'text-[#6B93FF]'
              : muted
                ? 'text-zinc-500'
                : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
