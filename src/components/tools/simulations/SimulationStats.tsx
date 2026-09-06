type SimulationStatProps = {
  label: string;
  value: string;
  note?: string;
};

export function SimulationStat({ label, value, note }: SimulationStatProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/30 px-2 py-1">
      <p className="text-[10px] font-medium tracking-[0.04em] text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 whitespace-nowrap text-[13px] font-semibold tabular-nums text-white">
        {value}
      </p>
      {note ? (
        <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{note}</p>
      ) : null}
    </div>
  );
}

type SimulationStatsProps = {
  items: SimulationStatProps[];
};

export function SimulationStats({ items }: SimulationStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
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
