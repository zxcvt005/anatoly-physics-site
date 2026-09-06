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
  /**
   * Wider controls column (e.g. MKT two-column panel).
   */
  controlsWide?: boolean;
};

export function SimulationShell({
  scene,
  controls,
  fillWorkspace = false,
  fitViewport = false,
  controlsWide = false,
}: SimulationShellProps) {
  const wideControls = fillWorkspace || fitViewport;

  if (!fitViewport) {
    return (
      <div
        className={`grid w-full items-start gap-4 lg:gap-5 ${
          controlsWide
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]'
            : wideControls
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
        controlsWide
          ? 'lg:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)]'
          : 'lg:grid-cols-[minmax(0,1fr)_minmax(15rem,17rem)]'
      }`}
    >
      <div className="flex min-h-0 min-w-0 w-full max-lg:w-full lg:h-full lg:overflow-hidden">
        {scene}
      </div>
      <div className="flex min-h-0 min-w-0 w-full max-lg:w-full lg:h-full lg:overflow-y-auto lg:overscroll-contain">
        {controls}
      </div>
    </div>
  );
}
