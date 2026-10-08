'use client';

import { MANUAL_QUESTION_RULES } from '@/lib/tools/ege-checker/constants';
import { formatCountLabel } from '@/lib/tools/navigation';
import {
  formatScoreFraction,
  formatScoreMark,
  formatScoreStatusLabel,
} from '@/lib/tools/ege-checker/scoring';
import type { ExamScoreResult } from '@/lib/tools/ege-checker/types';

type EgeCheckerResultProps = {
  result: ExamScoreResult;
};

function resultChipClass(score: number, maxScore: number): string {
  if (maxScore > 0 && score === maxScore) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (score > 0) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  }

  return 'border-red-500/35 bg-red-500/10 text-red-400';
}

function ResultChip({
  label,
  value,
  score,
  maxScore,
}: {
  label: string;
  value: string;
  score: number;
  maxScore: number;
}) {
  return (
    <span
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border px-2.5 text-sm font-semibold tabular-nums ${resultChipClass(score, maxScore)}`}
      aria-label={label}
    >
      <span aria-hidden>{value}</span>
    </span>
  );
}

export function EgeCheckerResult({ result }: EgeCheckerResultProps) {
  const { firstPart } = result;
  const primaryLabel = formatCountLabel(
    result.primaryScore,
    'балл',
    'балла',
    'баллов',
  );

  return (
    <section className="rounded-3xl border border-[#3166F0]/25 bg-[#3166F0]/10 px-5 py-6 backdrop-blur-sm sm:px-8 sm:py-8">
      <p className="text-sm uppercase tracking-[0.3em] text-[#9eb6ff]">Результат</p>
      <p className="mt-3 text-5xl font-bold tracking-tight text-white sm:text-6xl">
        {result.primaryScore} / {result.testScore}
      </p>
      <p className="mt-2 text-sm text-zinc-400">
        первичные / тестовые · получено {primaryLabel}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 sm:px-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Первичные</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-white">
            {result.primaryScore} / {result.primaryMax}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 sm:px-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Тестовые</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-white">
            {result.testScore} / {result.testMax}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 sm:px-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Первая часть</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
            {result.firstPartScore} / {result.firstPartMax}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 sm:px-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Вторая часть</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
            {result.secondPartScore} / {result.secondPartMax}
          </dd>
        </div>
      </dl>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-2 py-3">
          <dt className="text-xs text-emerald-200/80">Правильных</dt>
          <dd className="mt-1 text-xl font-semibold text-emerald-300">
            {firstPart.correct}
          </dd>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-2 py-3">
          <dt className="text-xs text-amber-200/80">Частично</dt>
          <dd className="mt-1 text-xl font-semibold text-amber-200">
            {firstPart.partial}
          </dd>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-2 py-3">
          <dt className="text-xs text-red-300/80">Ошибок</dt>
          <dd className="mt-1 text-xl font-semibold text-red-400">
            {firstPart.incorrect}
          </dd>
        </div>
      </dl>

      <div className="mt-6 space-y-4">
        <div>
          <p className="mb-3 text-sm text-zinc-500">Задания 1–20</p>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Задания 1–20">
            {firstPart.questions.map((question) => (
              <span key={question.number} role="listitem">
                <ResultChip
                  score={question.score}
                  maxScore={question.maxScore}
                  value={`${question.number} ${formatScoreMark(question.score, question.maxScore)}`}
                  label={`Задание ${question.number}: ${formatScoreStatusLabel(question.status)} ${formatScoreFraction(question.score, question.maxScore)}`}
                />
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm text-zinc-500">Задания 21–26</p>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Задания 21–26">
            {MANUAL_QUESTION_RULES.map((rule) => {
              const score = result.manualScores[String(rule.number)] ?? 0;
              return (
                <span key={rule.number} role="listitem">
                  <ResultChip
                    score={score}
                    maxScore={rule.maxScore}
                    value={`${rule.number} ${formatScoreFraction(score, rule.maxScore)}`}
                    label={`Задание ${rule.number}: ${formatScoreFraction(score, rule.maxScore)}`}
                  />
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
