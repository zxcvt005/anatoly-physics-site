type SimulationStatProps = {
  label: string;
  value: string;
};

export function SimulationStat({ label, value }: SimulationStatProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

type SimulationStatsProps = {
  items: SimulationStatProps[];
};

export function SimulationStats({ items }: SimulationStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <SimulationStat key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
