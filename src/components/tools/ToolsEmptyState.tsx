type ToolsEmptyStateProps = {
  title?: string;
  description?: string;
  sectionLabel?: string;
};

export function ToolsEmptyState({
  title = 'Симуляции уже готовятся',
  description = 'Здесь появятся интерактивные инструменты для изучения физики.',
  sectionLabel,
}: ToolsEmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/80 px-6 py-16 text-center backdrop-blur-sm sm:px-10 sm:py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(49,102,240,0.15) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#3166F0]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[#3166F0]/5 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-lg">
        {sectionLabel && (
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-[#3166F0]">
            {sectionLabel}
          </p>
        )}

        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-black/50 text-zinc-500"
          aria-hidden
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle
              cx="16"
              cy="16"
              r="10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.5" />
            <path
              d="M16 6V10M16 22V26M6 16H10M22 16H26"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        <p className="text-base leading-relaxed text-zinc-400 sm:text-lg">
          {description}
        </p>
      </div>
    </div>
  );
}
