type SimulationControlsProps = {
  children: React.ReactNode;
};

export function SimulationControls({ children }: SimulationControlsProps) {
  return (
    <aside className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur-sm sm:p-5">
      <div className="space-y-5">{children}</div>
    </aside>
  );
}
