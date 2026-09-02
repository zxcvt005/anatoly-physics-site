'use client';

import { SimulationNumericValue } from '@/components/tools/simulations/SimulationNumericValue';

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

  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-300">{label}</span>
        <SimulationNumericValue value={displayValue} />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="simulation-range h-11 cursor-pointer touch-manipulation"
        style={{
          background: `linear-gradient(to right, #3166F0 0%, #3166F0 ${progress}%, #27272a ${progress}%, #27272a 100%)`,
        }}
        aria-label={label}
      />
    </label>
  );
}
