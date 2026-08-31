'use client';

import { X } from 'lucide-react';
import {
  calculateProbabilities,
  formatProbability,
  getParticipantColor,
  getTotalTickets,
  type FortuneWheelParticipant,
} from '@/lib/tools/fortune-wheel';
import { FortuneWheelParticipantForm } from '@/components/tools/fortune-wheel/FortuneWheelParticipantForm';

type FortuneWheelParticipantsProps = {
  participants: FortuneWheelParticipant[];
  onAdd: (name: string, tickets: number) => boolean;
  onUpdateTickets: (participantId: string, tickets: number) => void;
  onRemove: (participantId: string) => void;
};

export function FortuneWheelParticipants({
  participants,
  onAdd,
  onUpdateTickets,
  onRemove,
}: FortuneWheelParticipantsProps) {
  const participantsWithProbability = calculateProbabilities(participants);
  const totalTickets = getTotalTickets(participants);

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 backdrop-blur-sm sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">Участники</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Всего билетов:{' '}
            <span className="font-semibold text-zinc-300">{totalTickets}</span>
          </p>
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="mb-6 rounded-2xl border border-dashed border-zinc-800 bg-black/30 px-4 py-8 text-center">
          <p className="font-semibold text-zinc-300">Участников пока нет</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Добавьте имя и количество билетов,
            <br />
            чтобы начать розыгрыш.
          </p>
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          {participantsWithProbability.map((participant, index) => (
            <div
              key={participant.id}
              className="rounded-2xl border border-zinc-800 bg-black/40 p-4 transition hover:border-zinc-700"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{
                      backgroundColor: getParticipantColor(participant.colorIndex),
                    }}
                  >
                    {index + 1}
                  </span>
                  <p className="truncate text-base font-semibold text-white">
                    {participant.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(participant.id)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition hover:border-zinc-700 hover:text-white"
                  aria-label={`Удалить ${participant.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={participant.tickets}
                    onChange={(event) => {
                      const nextTickets = Number.parseInt(event.target.value, 10);
                      if (Number.isFinite(nextTickets) && nextTickets >= 1) {
                        onUpdateTickets(participant.id, nextTickets);
                      }
                    }}
                    className="no-spinner w-20 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-[#3166F0]/50"
                    aria-label={`Количество билетов для ${participant.name}`}
                  />
                  <span className="text-sm text-zinc-500">билетов</span>
                </div>
                <span className="ml-auto text-sm font-semibold text-[#3166F0]">
                  {formatProbability(participant.probability)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-800 pt-6">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Добавить участника
        </p>
        <FortuneWheelParticipantForm onAdd={onAdd} />
      </div>
    </div>
  );
}
