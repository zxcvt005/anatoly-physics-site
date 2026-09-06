type SimulationControlSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function SimulationControlSection({
  title,
  children,
}: SimulationControlSectionProps) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}
