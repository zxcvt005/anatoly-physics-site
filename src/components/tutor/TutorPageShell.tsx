import Link from 'next/link';

interface TutorPageShellProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function TutorPageShell({
  title,
  subtitle,
  badge,
  actions,
  children,
}: TutorPageShellProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(49,102,240,0.12)_0%,_transparent_60%)]"
        aria-hidden
      />

      <header className="relative z-10 border-b border-zinc-800 bg-black/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            ← На сайт
          </Link>
          {badge && (
            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
              {badge}
            </span>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-zinc-400 md:text-lg">{subtitle}</p>
            )}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
