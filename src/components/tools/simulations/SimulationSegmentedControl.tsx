'use client';

type SimulationSegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

type SimulationSegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: SimulationSegmentedControlOption<T>[];
  onChange: (value: T) => void;
};

export function SimulationSegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SimulationSegmentedControlProps<T>) {
  return (
    <div>
      <p className="mb-2 text-sm text-zinc-300">{label}</p>
      <div
        className="grid grid-cols-2 rounded-2xl border border-zinc-800 bg-black/40 p-1"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(option.value)}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition duration-200 ${
                isActive
                  ? 'bg-[#3166F0] text-white shadow-[0_8px_24px_rgba(49,102,240,0.28)]'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
