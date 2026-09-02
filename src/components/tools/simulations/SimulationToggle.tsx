'use client';

type SimulationToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SimulationToggle({
  label,
  checked,
  onChange,
}: SimulationToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2.5">
      <span className="text-sm text-zinc-300">{label}</span>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-zinc-800 transition peer-checked:bg-[#3166F0]/80 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#3166F0]" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
