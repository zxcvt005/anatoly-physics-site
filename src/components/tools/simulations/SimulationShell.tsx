type SimulationShellProps = {
  scene: React.ReactNode;
  controls: React.ReactNode;
};

export function SimulationShell({ scene, controls }: SimulationShellProps) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18.5rem)] lg:gap-5">
      <div className="min-w-0">{scene}</div>
      <div className="min-w-0 lg:sticky lg:top-24">{controls}</div>
    </div>
  );
}
