type SimulationSceneProps = {
  label?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
};

export function SimulationScene({
  label = 'Визуальная симуляция',
  toolbar,
  children,
}: SimulationSceneProps) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#07080d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      aria-label={label}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(49,102,240,0.12) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-[#3166F0]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-8 h-40 w-40 rounded-full bg-[#3166F0]/8 blur-3xl"
        aria-hidden
      />

      {toolbar && (
        <div className="relative z-10 flex items-center justify-end gap-2 px-3 pt-3 sm:px-4 sm:pt-4">
          {toolbar}
        </div>
      )}

      <div className="relative z-10">{children}</div>
    </section>
  );
}
