type SimulationControlSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SimulationControlSection({
  title,
  children,
}: SimulationControlSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
