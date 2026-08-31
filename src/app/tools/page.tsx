import type { Metadata } from 'next';
import { ToolCard } from '@/components/tools/ToolCard';
import { toolPlaceholders } from '@/lib/tools/navigation';

export const metadata: Metadata = {
  title: 'Инструменты по физике — интерактивные симуляции',
  description:
    'Интерактивные инструменты и симуляции по физике для изучения и подготовки к ЕГЭ.',
  openGraph: {
    title: 'Инструменты по физике — интерактивные симуляции',
    description:
      'Интерактивные инструменты и симуляции по физике для изучения и подготовки к ЕГЭ.',
    type: 'website',
    locale: 'ru_RU',
  },
};

export default function ToolsPage() {
  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-12 sm:px-10 sm:py-16">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#3166F0]/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#3166F0]/10 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-400">
            Инструменты
          </p>
          <h1 className="mb-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            Физика, которую можно потрогать
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Интерактивные инструменты и симуляции, которые помогают увидеть
            физику в действии.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Библиотека симуляций</h2>
            <p className="mt-1 text-sm text-zinc-500 sm:text-base">
              Интерактивные симуляции для изучения физики
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            В разработке
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {toolPlaceholders.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>
    </div>
  );
}
