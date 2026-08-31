'use client';

import { useState } from 'react';

type FortuneWheelParticipantFormProps = {
  onAdd: (name: string, tickets: number) => boolean;
};

export function FortuneWheelParticipantForm({
  onAdd,
}: FortuneWheelParticipantFormProps) {
  const [name, setName] = useState('');
  const [tickets, setTickets] = useState('1');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedTickets = Number.parseInt(tickets, 10);
    if (!Number.isFinite(parsedTickets) || parsedTickets < 1) {
      return;
    }

    const added = onAdd(name, parsedTickets);
    if (added) {
      setName('');
      setTickets('1');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="fortune-wheel-name"
          className="mb-2 block text-sm font-medium text-zinc-300"
        >
          Имя
        </label>
        <input
          id="fortune-wheel-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Введите имя участника"
          className="w-full rounded-xl border border-zinc-800 bg-black/50 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-[#3166F0]/50"
        />
      </div>

      <div>
        <label
          htmlFor="fortune-wheel-tickets"
          className="mb-2 block text-sm font-medium text-zinc-300"
        >
          Количество билетов
        </label>
        <input
          id="fortune-wheel-tickets"
          type="number"
          min={1}
          step={1}
          value={tickets}
          onChange={(event) => setTickets(event.target.value)}
          className="no-spinner w-full rounded-xl border border-zinc-800 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-[#3166F0]/50"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#3166F0]/50 hover:bg-zinc-900"
      >
        Добавить
      </button>
    </form>
  );
}
