'use client';

import { useState } from 'react';
import {
  formatMockExamDateLabel,
  formatScorePercent,
} from '@/lib/mock-exams/calculations';
import type { StudentMockExamView } from '@/lib/mock-exams/types';

type MockExamsChartProps = {
  views: StudentMockExamView[];
};

export function MockExamsChart({ views }: MockExamsChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (views.length === 0) {
    return null;
  }

  const chartHeight = 220;
  const barMaxHeight = 160;

  return (
    <div className="overflow-x-auto">
      <div
        className="relative flex items-end gap-3 px-1 pb-2 pt-8"
        style={{ minWidth: Math.max(views.length * 72, 280) }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-8 bottom-10"
          aria-hidden
        >
          {[0, 25, 50, 75, 100].map((mark) => (
            <div
              key={mark}
              className="absolute inset-x-0 border-t border-zinc-800/80"
              style={{ bottom: `${mark}%` }}
            />
          ))}
        </div>

        {views.map((view) => {
          const height = Math.max(
            4,
            (Math.min(100, Math.max(0, view.percent)) / 100) * barMaxHeight,
          );
          const isHovered = hoveredId === view.exam.id;

          return (
            <div
              key={view.exam.id}
              className="relative z-10 flex w-14 shrink-0 flex-col items-center"
              onMouseEnter={() => setHoveredId(view.exam.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {isHovered ? (
                <div className="absolute -top-2 left-1/2 z-20 w-36 -translate-x-1/2 -translate-y-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-center shadow-xl">
                  <p className="text-xs font-semibold text-white">
                    {view.exam.title}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#9eb6ff]">
                    {view.score} / {view.exam.maxScore}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {formatScorePercent(view.percent)} ·{' '}
                    {formatMockExamDateLabel(view.exam.examDate)}
                  </p>
                </div>
              ) : null}

              <div
                className="flex w-full items-end justify-center"
                style={{ height: chartHeight - 48 }}
              >
                <div
                  className={`w-9 rounded-t-xl bg-gradient-to-t from-[#1e3fa0] to-[#3166F0] shadow-[0_0_20px_rgba(49,102,240,0.25)] transition duration-300 ${
                    isHovered ? 'opacity-100 brightness-110' : 'opacity-90'
                  }`}
                  style={{ height }}
                  title={`${view.exam.title}: ${view.score}/${view.exam.maxScore}`}
                />
              </div>
              <p className="mt-2 line-clamp-2 min-h-8 text-center text-[11px] leading-tight text-zinc-400">
                {view.exam.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
