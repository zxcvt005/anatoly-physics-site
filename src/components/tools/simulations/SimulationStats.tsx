type SimulationStatProps = {
  label: string;
  value: string;
  note?: string;
};

export function SimulationStat({ label, value, note }: SimulationStatProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2.5">
      <p className="text-[11px] font-medium tracking-[0.04em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 whitespace-nowrap text-sm font-semibold tabular-nums text-white">
        {value}
      </p>
      {note ? (
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{note}</p>
      ) : null}
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
        <SimulationStat
          key={item.label}
          label={item.label}
          value={item.value}
          note={item.note}
        />
      ))}
    </div>
  );
}
