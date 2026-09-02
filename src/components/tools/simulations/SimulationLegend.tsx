type SimulationLegendItem = {
  color: string;
  label: string;
};

type SimulationLegendProps = {
  items: SimulationLegendItem[];
};

export function SimulationLegend({ items }: SimulationLegendProps) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-400">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
