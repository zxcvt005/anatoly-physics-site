type SimulationShellProps = {
  scene: React.ReactNode;
  controls: React.ReactNode;
  fillWorkspace?: boolean;
};

export function SimulationShell({
  scene,
  controls,
  fillWorkspace = false,
}: SimulationShellProps) {
  return (
    <div
      className={`grid w-full items-start gap-4 lg:gap-5 ${
        fillWorkspace
          ? 'lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]'
          : 'lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18.5rem)]'
      }`}
    >
      <div className="min-w-0 w-full">{scene}</div>
      <div className="min-w-0 lg:sticky lg:top-24">{controls}</div>
    </div>
  );
}
