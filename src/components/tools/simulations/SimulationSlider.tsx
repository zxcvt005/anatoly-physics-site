'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { SimulationNumericValue } from '@/components/tools/simulations/SimulationNumericValue';
import {
  formatSimulationNumberInput,
  parseSimulationNumberInput,
  resolveSimulationNumberBlur,
  snapSimulationNumber,
  stepDecimals,
} from '@/lib/tools/simulations/number-input';

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
  const decimals = stepDecimals(step);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  draftRef.current = draft;
  valueRef.current = value;
  onChangeRef.current = onChange;

  const inputValue =
    draft !== null ? draft : formatSimulationNumberInput(value, decimals);

  const commitDraftIfNeeded = () => {
    const currentDraft = draftRef.current;
    if (currentDraft === null) {
      return;
    }

    if (document.activeElement === inputRef.current) {
      return;
    }

    const resolved = resolveSimulationNumberBlur(
      currentDraft,
      valueRef.current,
      min,
      max,
      decimals,
    );
    setDraft(null);
    if (resolved !== valueRef.current) {
      onChangeRef.current(resolved);
    }
  };

  useEffect(() => {
    commitDraftIfNeeded();
  }, [value, draft, decimals, max, min]);

  useEffect(() => {
    const handleFocusChange = () => {
      commitDraftIfNeeded();
    };

    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('pointerdown', handleFocusChange, true);
    return () => {
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('pointerdown', handleFocusChange, true);
    };
  }, [decimals, max, min]);

  const commit = (next: number) => {
    const snapped = snapSimulationNumber(next, min, max, decimals);
    if (snapped !== value) {
      onChange(snapped);
    }
    return snapped;
  };

  const handleRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) {
      return;
    }

    const snapped = commit(next);
    if (draft !== null) {
      setDraft(formatSimulationNumberInput(snapped, decimals));
    }
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setDraft(raw);

    const parsed = parseSimulationNumberInput(raw);
    if (parsed === null) {
      return;
    }

    commit(parsed);
  };

  const handleNumberFocus = () => {
    setDraft(formatSimulationNumberInput(value, decimals));
  };

  const handleNumberBlur = () => {
    commitDraftIfNeeded();
  };

  return (
    <div className="block">
      <span className="mb-0.5 flex items-center justify-between gap-3 text-sm lg:text-[12px]">
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
          onChange={handleRangeChange}
          className="simulation-range h-11 min-w-0 flex-1 cursor-pointer touch-manipulation lg:h-7"
          style={{
            background: `linear-gradient(to right, #3166F0 0%, #3166F0 ${progress}%, #27272a ${progress}%, #27272a 100%)`,
          }}
          aria-label={label}
        />
        <input
          ref={inputRef}
          type="number"
          min={min}
          max={max}
          step={step}
          value={inputValue}
          disabled={disabled}
          onChange={handleNumberChange}
          onFocus={handleNumberFocus}
          onBlur={handleNumberBlur}
          className="simulation-number-input h-11 w-[4.5rem] shrink-0 rounded-xl border border-white/10 bg-black/40 px-2 text-center text-sm font-medium tabular-nums text-white outline-none transition focus:border-[#3166F0]/60 lg:h-7"
          aria-label={`${label}, число`}
        />
      </div>
    </div>
  );
}
