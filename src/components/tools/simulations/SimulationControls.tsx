type SimulationControlsProps = {
  children: React.ReactNode;
  compact?: boolean;
  /** Desktop fitViewport: fill parent height and keep content dense. */
  fitHeight?: boolean;
};

export function SimulationControls({
  children,
  compact = false,
  fitHeight = false,
}: SimulationControlsProps) {
  return (
    <aside
      className={[
        'rounded-3xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-sm',
        compact ? 'p-2.5 sm:p-3' : 'p-4 sm:p-5',
        fitHeight ? 'flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          compact ? 'space-y-2.5' : 'space-y-5',
          fitHeight ? 'min-h-0 lg:flex-1' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </aside>
  );
}
