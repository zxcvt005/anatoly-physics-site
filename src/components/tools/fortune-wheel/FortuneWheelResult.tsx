'use client';

import { formatProbability, type FortuneWheelSpinResult } from '@/lib/tools/fortune-wheel';

type FortuneWheelResultProps = {
  result: FortuneWheelSpinResult;
  onSpinAgain: () => void;
  isSpinning: boolean;
};

export function FortuneWheelResult({
  result,
  onSpinAgain,
  isSpinning,
}: FortuneWheelResultProps) {
  return (
    <div className="animate-[fade-in_0.4s_ease-out] rounded-3xl border border-[#3166F0]/30 bg-[#3166F0]/10 px-6 py-8 text-center backdrop-blur-sm">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-[#3166F0]">
        Победитель
      </p>
      <p className="mb-2 text-3xl font-bold text-white sm:text-4xl">{result.winnerName}</p>
      <p className="mb-6 text-base text-zinc-400">
        Шанс на победу:{' '}
        <span className="font-semibold text-white">
          {formatProbability(result.probability)}
        </span>
      </p>
      <button
        type="button"
        onClick={onSpinAgain}
        disabled={isSpinning}
        className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Крутить снова
      </button>
    </div>
  );
}
