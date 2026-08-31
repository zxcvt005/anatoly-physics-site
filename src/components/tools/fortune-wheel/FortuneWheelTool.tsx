'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { FortuneWheelParticipants } from '@/components/tools/fortune-wheel/FortuneWheelParticipants';
import { FortuneWheelResult } from '@/components/tools/fortune-wheel/FortuneWheelResult';
import { FortuneWheelSvg } from '@/components/tools/fortune-wheel/FortuneWheelSvg';
import { useFortuneWheelState } from '@/components/tools/fortune-wheel/useFortuneWheelState';
import {
  formatProbability,
  getTotalTickets,
  spinFortuneWheel,
  type FortuneWheelSpinResult,
} from '@/lib/tools/fortune-wheel';

export function FortuneWheelTool() {
  const {
    participants,
    lastResult,
    isHydrated,
    addParticipant,
    updateParticipantTickets,
    removeParticipant,
    saveSpinResult,
  } = useFortuneWheelState();

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeResult, setActiveResult] = useState<FortuneWheelSpinResult | null>(null);
  const [hasSpunOnce, setHasSpunOnce] = useState(false);
  const pendingResultRef = useRef<FortuneWheelSpinResult | null>(null);

  const totalTickets = useMemo(
    () => getTotalTickets(participants),
    [participants],
  );

  const canSpin = participants.length > 0 && totalTickets > 0 && !isSpinning;

  const statusMessage = useMemo(() => {
    if (participants.length === 0) {
      return 'Добавьте первого участника';
    }

    if (!hasSpunOnce && !activeResult) {
      return 'Добавьте участников и нажмите «Крутить»';
    }

    return null;
  }, [activeResult, hasSpunOnce, participants.length]);

  const handleSpin = useCallback(() => {
    if (!canSpin) {
      return;
    }

    const randomWinner = Math.random() * totalTickets;
    const randomInSector = Math.random();
    const spin = spinFortuneWheel(
      participants,
      rotation,
      randomWinner,
      randomInSector,
      6 + Math.floor(Math.random() * 3),
    );

    if (!spin.result || !spin.winner) {
      return;
    }

    pendingResultRef.current = spin.result;
    setIsSpinning(true);
    setActiveResult(null);
    setRotation(spin.targetRotation);
    setHasSpunOnce(true);
  }, [canSpin, participants, rotation, totalTickets]);

  const handleTransitionEnd = useCallback(() => {
    if (!pendingResultRef.current) {
      return;
    }

    const result = pendingResultRef.current;
    pendingResultRef.current = null;
    setIsSpinning(false);
    setActiveResult(result);
    saveSpinResult(result);
  }, [saveSpinResult]);

  const handleSpinAgain = useCallback(() => {
    setActiveResult(null);
    handleSpin();
  }, [handleSpin]);

  if (!isHydrated) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-6 py-16 text-center text-zinc-500">
        Загрузка колеса…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-sm uppercase tracking-[0.35em] text-zinc-400">
          Не физика
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">Колесо фортуны</h1>
        <p className="mt-2 text-base text-zinc-400 sm:text-lg">
          Розыгрыш по количеству билетов
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:gap-8">
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 backdrop-blur-sm sm:p-8">
            <FortuneWheelSvg
              participants={participants}
              rotation={rotation}
              isSpinning={isSpinning}
              onTransitionEnd={handleTransitionEnd}
            />

            {statusMessage && !activeResult && (
              <p className="mt-6 text-center text-sm text-zinc-500">{statusMessage}</p>
            )}

            {!activeResult && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={!canSpin}
                  className="rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSpinning ? 'Крутим…' : 'Крутить'}
                </button>
              </div>
            )}
          </div>

          {activeResult && (
            <FortuneWheelResult
              result={activeResult}
              onSpinAgain={handleSpinAgain}
              isSpinning={isSpinning}
            />
          )}

          {!activeResult && lastResult && !isSpinning && hasSpunOnce && (
            <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3 text-center text-sm text-zinc-500">
              Последний победитель:{' '}
              <span className="font-semibold text-zinc-300">{lastResult.winnerName}</span>{' '}
              ({formatProbability(lastResult.probability)})
            </div>
          )}
        </div>

        <FortuneWheelParticipants
          participants={participants}
          onAdd={addParticipant}
          onUpdateTickets={updateParticipantTickets}
          onRemove={removeParticipant}
        />
      </div>
    </div>
  );
}
