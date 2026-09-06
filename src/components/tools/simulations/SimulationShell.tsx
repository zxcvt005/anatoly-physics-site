type SimulationShellProps = {
  scene: React.ReactNode;
  controls: React.ReactNode;
  /**
   * Use the full workspace width when the library is collapsed.
   * Prefer with SimulationPage fitViewport.
   */
  fillWorkspace?: boolean;
  /**
   * Desktop: occupy parent height and keep scene+controls in one viewport.
   * Scene scales within available space; controls stay visible.
   */
  fitViewport?: boolean;
};

export function SimulationShell({
  scene,
  controls,
  fillWorkspace = false,
  fitViewport = false,
}: SimulationShellProps) {
  const wideControls = fillWorkspace || fitViewport;

  if (!fitViewport) {
    return (
      <div
        className={`grid w-full items-start gap-4 lg:gap-5 ${
          wideControls
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]'
            : 'lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18.5rem)]'
        }`}
      >
        <div className="min-w-0 w-full">{scene}</div>
        <div className="min-w-0 lg:sticky lg:top-24">{controls}</div>
      </div>
    );
  }

  return (
    <div
      className={`grid h-full min-h-0 w-full grid-cols-1 gap-3 max-lg:h-auto max-lg:items-start lg:grid-rows-1 lg:gap-3 ${
        wideControls
          ? 'lg:grid-cols-[minmax(0,1fr)_minmax(14.5rem,17rem)]'
          : 'lg:grid-cols-[minmax(0,1fr)_minmax(14.5rem,16.5rem)]'
      }`}
    >
      <div className="flex min-h-0 min-w-0 max-lg:w-full lg:h-full lg:overflow-hidden">
        {scene}
      </div>
      <div className="flex min-h-0 min-w-0 max-lg:w-full lg:h-full lg:overflow-y-auto lg:overscroll-contain">
        {controls}
      </div>
    </div>
  );
}
