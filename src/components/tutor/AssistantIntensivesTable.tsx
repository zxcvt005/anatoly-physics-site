'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  intensiveStatusCode,
  intensiveStatusLabels,
} from '@/lib/intensive-utils';
import { formatStudentShortName } from '@/lib/tutor-calculations';
import { sortStudentsByName, useIntensives } from '@/providers/IntensivesProvider';
import type { IntensiveStatus, Student } from '@/types/tutor';

const cellStatusStyles: Record<IntensiveStatus, string> = {
  not_started: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/35 hover:bg-red-500/30',
  in_progress:
    'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/35 hover:bg-orange-500/30',
  completed:
    'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/35 hover:bg-emerald-500/30',
};

interface AssistantIntensivesTableProps {
  students: Student[];
}

export function AssistantIntensivesTable({
  students,
}: AssistantIntensivesTableProps) {
  const { intensives, getStatus, cycleStatus, addIntensive } = useIntensives();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const sortedStudents = sortStudentsByName(students);

  const handleAddIntensive = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    addIntensive(trimmed);
    setNewTitle('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white md:text-lg">
            Прогресс по интенсивам
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Клик по ячейке переключает статус: 0 → 1 → 2
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#3166F0]/40 bg-[#3166F0]/10 px-4 py-2 text-sm font-medium text-[#6B93FF] transition hover:border-[#3166F0]/60 hover:bg-[#3166F0]/20 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Добавить интенсив
        </button>
      </div>

      {isAdding && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="min-w-[220px] flex-1">
            <label
              htmlFor="new-intensive-title"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Название интенсива
            </label>
            <input
              id="new-intensive-title"
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleAddIntensive();
              }}
              placeholder="Например: Оптика"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>
          <button
            type="button"
            onClick={handleAddIntensive}
            disabled={!newTitle.trim()}
            className="rounded-xl bg-[#3166F0] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2856d4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewTitle('');
            }}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
          >
            Отмена
          </button>
        </div>
      )}

      {intensives.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center text-zinc-500">
          Интенсивы пока не добавлены
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/90">
                  <th className="sticky left-0 z-20 min-w-[140px] border-r border-zinc-800 bg-zinc-950 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Ученик
                  </th>
                  {intensives.map((intensive) => (
                    <th
                      key={intensive.id}
                      className="min-w-[120px] max-w-[160px] border-r border-zinc-800 px-2 py-2.5 text-center text-xs font-medium leading-snug text-zinc-300 last:border-r-0"
                      title={intensive.title}
                    >
                      <span className="line-clamp-2">{intensive.title}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((student, rowIndex) => (
                  <tr
                    key={student.id}
                    className={
                      rowIndex % 2 === 0 ? 'bg-zinc-950/40' : 'bg-zinc-950/70'
                    }
                  >
                    <td className="sticky left-0 z-10 border-r border-zinc-800 bg-inherit px-3 py-1.5 text-xs font-medium text-white">
                      {formatStudentShortName(student.name)}
                    </td>
                    {intensives.map((intensive) => {
                      const status = getStatus(student.id, intensive.id);
                      const code = intensiveStatusCode[status];

                      return (
                        <td
                          key={intensive.id}
                          className="border-r border-zinc-800 p-1 last:border-r-0"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              cycleStatus(student.id, intensive.id)
                            }
                            className={`flex h-8 w-full min-w-[44px] items-center justify-center rounded-md text-xs font-semibold transition ${cellStatusStyles[status]}`}
                            title={intensiveStatusLabels[status]}
                            aria-label={`${formatStudentShortName(student.name)}: ${intensive.title} — ${intensiveStatusLabels[status]}`}
                          >
                            {code}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
        <span className="font-medium text-zinc-500">Легенда:</span>
        <LegendItem code={0} label="не приступал" colorClass="bg-red-400" />
        <LegendItem code={1} label="в процессе" colorClass="bg-orange-400" />
        <LegendItem code={2} label="освоен" colorClass="bg-emerald-400" />
      </div>
    </div>
  );
}

function LegendItem({
  code,
  label,
  colorClass,
}: {
  code: number;
  label: string;
  colorClass: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold text-white ${colorClass}`}
      >
        {code}
      </span>
      <span>— {label}</span>
    </span>
  );
}
