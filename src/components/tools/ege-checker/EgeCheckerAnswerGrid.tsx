'use client';

import { QUESTION_RULES } from '@/lib/tools/ege-checker/constants';
import { formatScoreMark } from '@/lib/tools/ege-checker/scoring';
import type { QuestionScoreResult } from '@/lib/tools/ege-checker/types';

type EgeCheckerAnswerGridProps = {
  currentNumber: number;
  submitted: Record<string, boolean>;
  resultsByNumber: Record<string, QuestionScoreResult | undefined>;
  onSelect: (number: number) => void;
};

function markClass(result: QuestionScoreResult | undefined, isCurrent: boolean): string {
  if (isCurrent) {
    return 'border-[#3166F0] bg-[#3166F0]/20 text-white';
  }

  if (!result) {
    return 'border-zinc-800 bg-black/30 text-zinc-400 hover:border-zinc-600 hover:text-white';
  }

  if (result.status === 'correct') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (result.status === 'partial') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  }

  return 'border-red-500/35 bg-red-500/10 text-red-400';
}

export function EgeCheckerAnswerGrid({
  currentNumber,
  submitted,
  resultsByNumber,
  onSelect,
}: EgeCheckerAnswerGridProps) {
  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Задания">
      {QUESTION_RULES.map((rule) => {
        const key = String(rule.number);
        const isSubmitted = Boolean(submitted[key]);
        const result = isSubmitted ? resultsByNumber[key] : undefined;
        const isCurrent = rule.number === currentNumber;

        return (
          <button
            key={rule.number}
            type="button"
            role="listitem"
            onClick={() => onSelect(rule.number)}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border px-2.5 text-sm font-semibold transition ${markClass(result, isCurrent)}`}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={
              result
                ? `Задание ${rule.number}, ${formatScoreMark(result.score, result.maxScore)} ${result.score} из ${result.maxScore}`
                : `Задание ${rule.number}`
            }
          >
            <span>{rule.number}</span>
            {result ? (
              <span aria-hidden>{formatScoreMark(result.score, result.maxScore)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
