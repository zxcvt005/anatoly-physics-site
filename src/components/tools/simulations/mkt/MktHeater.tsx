'use client';

import { formatTemperatureK } from '@/lib/tools/simulations/mkt/physics';

type MktHeaterProps = {
  heater: number;
  temperatureK: number;
  onHeaterChange: (heater: number) => void;
};

export function MktHeater({
  heater,
  temperatureK,
  onHeaterChange,
}: MktHeaterProps) {
  const heat = Math.max(0, heater);
  const cold = Math.max(0, -heater);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex flex-col items-center">
        <div
          className="relative flex h-16 w-16 items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          aria-hidden
        >
          {heat > 0.02 && (
            <div
              className="absolute bottom-0 left-1/2 w-10 -translate-x-1/2"
              style={{ height: `${18 + heat * 38}px` }}
            >
              <div className="absolute inset-x-2 bottom-0 h-full rounded-t-full bg-orange-500/90" />
              <div className="absolute inset-x-3 bottom-0 h-[70%] rounded-t-full bg-amber-300" />
              <div className="absolute inset-x-4 bottom-0 h-[40%] rounded-t-full bg-white/80" />
            </div>
          )}
          {cold > 0.02 && (
            <div
              className="absolute inset-x-1 bottom-1 flex items-end justify-center gap-0.5"
              style={{ height: `${12 + cold * 40}px` }}
            >
              {Array.from({ length: Math.max(1, Math.round(1 + cold * 4)) }).map(
                (_, index) => (
                  <span
                    key={index}
                    className="w-2.5 rounded-sm border border-sky-200/70 bg-gradient-to-b from-sky-50 to-sky-300/80"
                    style={{ height: `${40 + ((index * 17) % 28)}%` }}
                  />
                ),
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {heater > 0.02 ? 'Нагрев' : heater < -0.02 ? 'Охлаждение' : 'Нейтрально'}
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-zinc-400">
          {formatTemperatureK(temperatureK)}
        </p>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Нагрев и охлаждение</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={heater}
          onChange={(event) => onHeaterChange(Number(event.target.value))}
          className="simulation-range h-11 w-full cursor-pointer touch-manipulation"
          style={{
            background:
              'linear-gradient(to right, #38bdf8 0%, #27272a 50%, #f97316 100%)',
          }}
          aria-label="Нагрев и охлаждение"
        />
      </label>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
        <span>Охлаждение</span>
        <span>Нагрев</span>
      </div>
    </div>
  );
}
