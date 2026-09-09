'use client';

import { MANUAL_QUESTION_RULES } from '@/lib/tools/ege-checker/constants';
import type { ManualScoreMap } from '@/lib/tools/ege-checker/types';

type EgeCheckerManualPartProps = {
  scores: ManualScoreMap;
  onChange: (number: number, score: number) => void;
};

export function EgeCheckerManualPart({
  scores,
  onChange,
}: EgeCheckerManualPartProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-5 py-6 backdrop-blur-sm sm:px-8 sm:py-7">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Вторая часть</p>
        <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
          Задания 21–26
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Ручная оценка · максимум 17 баллов</p>
      </div>

      <div className="space-y-4">
        {MANUAL_QUESTION_RULES.map((rule) => {
          const key = String(rule.number);
          const selected = scores[key] ?? 0;
          const options = Array.from({ length: rule.maxScore + 1 }, (_, score) => score);

          return (
            <div
              key={rule.number}
              className="rounded-2xl border border-zinc-800/90 bg-black/30 px-4 py-4 sm:px-5"
            >
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="text-base font-semibold text-white">
                  Задание {rule.number}
                </p>
                <p className="text-sm text-zinc-500">максимум {rule.maxScore}</p>
              </div>
              <p className="mb-2 text-sm text-zinc-400">Полученный балл</p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label={`Балл за задание ${rule.number}`}
              >
                {options.map((score) => {
                  const isActive = selected === score;
                  const optionId = `ege-manual-${rule.number}-${score}`;

                  return (
                    <label
                      key={score}
                      htmlFor={optionId}
                      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                        isActive
                          ? 'border-[#3166F0] bg-[#3166F0] text-white shadow-[0_8px_24px_rgba(49,102,240,0.28)]'
                          : 'border-zinc-700 bg-zinc-900/70 text-zinc-300 hover:border-zinc-500 hover:text-white'
                      }`}
                    >
                      <input
                        id={optionId}
                        type="radio"
                        name={`ege-manual-${rule.number}`}
                        value={score}
                        checked={isActive}
                        onChange={() => onChange(rule.number, score)}
                        className="sr-only"
                      />
                      {score}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
