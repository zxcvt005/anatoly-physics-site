import type { ToolPlaceholder } from '@/lib/tools/navigation';

const accentStyles: Record<ToolPlaceholder['accent'], string> = {
  blue: 'from-[#3166F0]/25 to-[#3166F0]/5',
  violet: 'from-violet-500/25 to-violet-500/5',
  emerald: 'from-emerald-500/25 to-emerald-500/5',
  amber: 'from-amber-500/25 to-amber-500/5',
  rose: 'from-rose-500/25 to-rose-500/5',
  cyan: 'from-cyan-500/25 to-cyan-500/5',
};

const accentDot: Record<ToolPlaceholder['accent'], string> = {
  blue: 'bg-[#3166F0]',
  violet: 'bg-violet-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  cyan: 'bg-cyan-400',
};

type ToolCardProps = {
  tool: ToolPlaceholder;
};

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 transition duration-300 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      <div
        className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${accentStyles[tool.accent]}`}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />

        <div className="relative flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <span
              className={`h-2 w-2 rounded-full ${accentDot[tool.accent]} opacity-80`}
              aria-hidden
            />
            <span
              className={`h-2 w-2 rounded-full ${accentDot[tool.accent]} opacity-50`}
              aria-hidden
            />
            <span
              className={`h-2 w-2 rounded-full ${accentDot[tool.accent]} opacity-30`}
              aria-hidden
            />
          </div>
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-300 backdrop-blur-sm">
            Скоро
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {tool.category}
        </p>
        <h3 className="mb-2 text-lg font-bold text-white transition group-hover:text-[#3166F0] sm:text-xl">
          {tool.title}
        </h3>
        <p className="text-sm leading-relaxed text-zinc-400">{tool.description}</p>
      </div>
    </article>
  );
}
