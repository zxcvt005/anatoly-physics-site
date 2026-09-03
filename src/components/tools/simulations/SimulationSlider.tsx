'use client';

import { SimulationNumericValue } from '@/components/tools/simulations/SimulationNumericValue';
import { clamp } from '@/lib/tools/simulations/math';

type SimulationSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

function stepDecimals(step: number): number {
  if (!Number.isFinite(step) || step >= 1) {
    return 0;
  }

  const text = String(step);
  const index = text.indexOf('.');
  return index === -1 ? 1 : text.length - index - 1;
}

export function SimulationSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  disabled = false,
}: SimulationSliderProps) {
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
  const decimals = stepDecimals(step);

  const commit = (next: number) => {
    if (!Number.isFinite(next)) {
      return;
    }

    const snapped = Number(clamp(next, min, max).toFixed(decimals));
    onChange(snapped);
  };

  return (
    <div className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-300">{label}</span>
        <SimulationNumericValue value={displayValue} />
      </span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => commit(Number(event.target.value))}
          className="simulation-range h-11 min-w-0 flex-1 cursor-pointer touch-manipulation"
          style={{
            background: `linear-gradient(to right, #3166F0 0%, #3166F0 ${progress}%, #27272a ${progress}%, #27272a 100%)`,
          }}
          aria-label={label}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(decimals))}
          disabled={disabled}
          onChange={(event) => commit(Number(event.target.value))}
          className="h-11 w-[4.75rem] shrink-0 rounded-xl border border-white/10 bg-black/40 px-2 text-center text-sm font-medium tabular-nums text-white outline-none transition focus:border-[#3166F0]/60"
          aria-label={`${label}, число`}
        />
      </div>
    </div>
  );
}
