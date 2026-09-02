import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ToolsIcon } from '@/components/tools/ToolsIcon';
import {
  getChildCardMeta,
  getSectionCardMeta,
  type ToolsNavItem,
} from '@/lib/tools/navigation';

type ToolCardProps = {
  item: ToolsNavItem;
  variant?: 'section' | 'child';
};

export function ToolCard({ item, variant = 'section' }: ToolCardProps) {
  const meta =
    variant === 'section' ? getSectionCardMeta(item) : getChildCardMeta(item);
  const isReadyTool = item.type === 'tool';

  return (
    <Link
      href={item.path}
      className="group relative flex h-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#3166F0]/40 hover:shadow-[0_12px_40px_rgba(49,102,240,0.12)] sm:p-6"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#3166F0]/8 blur-2xl transition group-hover:bg-[#3166F0]/14"
        aria-hidden
      />

      <div className="relative flex min-w-0 flex-1 gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-[#3166F0]/10 text-[#3166F0] transition group-hover:border-[#3166F0]/30 group-hover:bg-[#3166F0]/15">
          <ToolsIcon name={item.icon} className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-white transition group-hover:text-[#3166F0] sm:text-xl">
              {item.title}
            </h3>
            <span className="mt-1 inline-flex shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-[#3166F0]">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {item.description}
          </p>

          <span
            className={`mt-4 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
              isReadyTool
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-400'
            }`}
          >
            {meta}
          </span>
        </div>
      </div>
    </Link>
  );
}
