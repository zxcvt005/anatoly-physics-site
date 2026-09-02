'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type SimulationFormulaLine = {
  id: string;
  expression: string;
  note?: string;
};

type SimulationFormulaBlockProps = {
  title?: string;
  lines: SimulationFormulaLine[];
  defaultOpen?: boolean;
};

export function SimulationFormulaBlock({
  title = 'Физика симуляции',
  lines,
  defaultOpen = false,
}: SimulationFormulaBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold text-zinc-200 transition hover:text-white"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      {open && (
        <div id={panelId} className="space-y-2 border-t border-zinc-800 px-3 py-3">
          {lines.map((line) => (
            <p key={line.id} className="text-sm leading-relaxed text-zinc-300">
              <span className="font-medium tabular-nums text-white">
                {line.expression}
              </span>
              {line.note && (
                <span className="mt-0.5 block text-xs text-zinc-500">{line.note}</span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
