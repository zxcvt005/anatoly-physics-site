'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  MAX_CUSTOM_RH_PERCENT,
  MIN_CUSTOM_RH_PERCENT,
} from '@/lib/tools/simulations/humidity/constants';
import { clampCustomRelativeHumidityPercent } from '@/lib/tools/simulations/humidity/physics';

type HumidityRhHudControlProps = {
  liveRhPercent: number;
  customRhPercent: number | null;
  onApply: (rhPercent: number) => void;
  onClear: () => void;
};

export function HumidityRhHudControl({
  liveRhPercent,
  customRhPercent,
  onApply,
  onClear,
}: HumidityRhHudControlProps) {
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const active = customRhPercent !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const initial =
      customRhPercent !== null
        ? String(Math.round(customRhPercent))
        : String(Math.round(liveRhPercent));
    setDraft(initial);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, customRhPercent, liveRhPercent]);

  const commit = () => {
    const parsed = Number(draft.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setOpen(false);
      return;
    }
    onApply(clampCustomRelativeHumidityPercent(parsed));
    setOpen(false);
  };

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
        Относительная влажность
      </p>
      <p className="mt-0.5 text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
        {Math.round(liveRhPercent)}%
      </p>

      {active ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-400">
            Желаемая: {Math.round(customRhPercent)}%
          </span>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2 py-0.5 text-[11px] font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            aria-expanded={open}
            aria-controls={panelId}
          >
            Изменить
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onClear();
            }}
            className="rounded-lg border border-transparent px-2 py-0.5 text-[11px] font-medium text-zinc-500 transition hover:text-zinc-300"
          >
            Сбросить
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition hover:border-[#3166F0]/50 hover:text-white"
          aria-expanded={open}
          aria-controls={panelId}
        >
          Своё значение
        </button>
      )}

      {open ? (
        <div
          id={panelId}
          className="mt-2 w-[min(100%,14rem)] rounded-xl border border-zinc-700 bg-zinc-950/95 p-2 shadow-lg shadow-black/40"
        >
          <label className="block text-[11px] text-zinc-400" htmlFor={`${panelId}-input`}>
            RH, % ({MIN_CUSTOM_RH_PERCENT}…{MAX_CUSTOM_RH_PERCENT})
          </label>
          <div className="mt-1 flex items-center gap-1.5">
            <input
              ref={inputRef}
              id={`${panelId}-input`}
              type="number"
              inputMode="decimal"
              min={MIN_CUSTOM_RH_PERCENT}
              max={MAX_CUSTOM_RH_PERCENT}
              step={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commit();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black/50 px-2 py-1 text-sm tabular-nums text-white outline-none focus:border-[#3166F0]"
            />
            <button
              type="button"
              onClick={commit}
              className="rounded-lg bg-[#3166F0] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#4574f2]"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
