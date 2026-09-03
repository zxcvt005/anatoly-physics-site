type SimulationNumericValueProps = {
  label?: string;
  value: string;
};

export function SimulationNumericValue({
  label,
  value,
}: SimulationNumericValueProps) {
  return (
    <span className="inline-flex items-baseline gap-1.5 font-medium tabular-nums">
      {label && <span className="text-zinc-500">{label}</span>}
      <span className="whitespace-nowrap text-white">{value}</span>
    </span>
  );
}
