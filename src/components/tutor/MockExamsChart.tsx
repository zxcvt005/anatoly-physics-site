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

const BAR_MAX_HEIGHT = 168;
const COLUMN_WIDTH = 84;
const SCORE_INSIDE_MIN_HEIGHT = 30;

export function MockExamsChart({ views }: MockExamsChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (views.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="relative px-4 pb-3 pt-14"
        style={{ minWidth: Math.max(views.length * COLUMN_WIDTH, 280) }}
      >
        <div
          className="pointer-events-none absolute bottom-[3.5rem] left-4 right-4 top-[5.5rem]"
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

        <div className="relative z-10 flex items-end gap-4">
          {views.map((view) => {
            const height = Math.max(
              10,
              (Math.min(100, Math.max(0, view.percent)) / 100) * BAR_MAX_HEIGHT,
            );
            const isHovered = hoveredId === view.exam.id;
            const scoreFitsInside = height >= SCORE_INSIDE_MIN_HEIGHT;
            const scoreFontClass =
              height >= 64 ? 'text-sm' : height >= 40 ? 'text-xs' : 'text-[11px]';

            return (
              <div
                key={view.exam.id}
                className="relative flex w-[4.75rem] shrink-0 flex-col items-center"
                onMouseEnter={() => setHoveredId(view.exam.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {isHovered ? (
                  <div className="absolute left-1/2 top-0 z-30 w-40 -translate-x-1/2 -translate-y-[calc(100%+0.4rem)] rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-center shadow-xl">
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

                <div className="mb-2 flex min-h-9 w-full flex-col justify-end px-0.5 text-center text-[11px] leading-tight text-zinc-400">
                  <span className="whitespace-nowrap">
                    {formatScorePercent(view.percent)}
                  </span>
                  <span className="whitespace-nowrap">
                    {formatMockExamDateLabel(view.exam.examDate)}
                  </span>
                </div>

                <div
                  className="flex w-full items-end justify-center"
                  style={{ height: BAR_MAX_HEIGHT }}
                >
                  <div
                    className={`relative flex w-11 justify-center rounded-t-xl bg-gradient-to-t from-[#1e3fa0] to-[#3166F0] shadow-[0_0_20px_rgba(49,102,240,0.25)] transition duration-300 ${
                      isHovered ? 'opacity-100 brightness-110' : 'opacity-95'
                    } ${scoreFitsInside ? 'items-center' : 'items-start pt-1'}`}
                    style={{ height }}
                    title={`${view.exam.title}: ${view.score}/${view.exam.maxScore}`}
                  >
                    <span
                      className={`font-bold tabular-nums leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] ${scoreFontClass}`}
                    >
                      {view.score}
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 min-h-10 w-full px-0.5 text-center text-[11px] leading-snug text-zinc-400 [overflow-wrap:anywhere]">
                  {view.exam.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
