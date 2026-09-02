type SimulationShellProps = {
  scene: React.ReactNode;
  controls: React.ReactNode;
};

export function SimulationShell({ scene, controls }: SimulationShellProps) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,22rem)] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
      <div className="min-w-0">{scene}</div>
      <div className="min-w-0 lg:sticky lg:top-24">{controls}</div>
    </div>
  );
}
