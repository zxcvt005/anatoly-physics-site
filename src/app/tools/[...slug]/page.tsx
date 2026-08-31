import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolsEmptyState } from '@/components/tools/ToolsEmptyState';
import {
  findNavItemByPath,
  getSectionTitle,
  isToolsHome,
  isValidToolsPath,
} from '@/lib/tools/navigation';

type ToolsSectionPageProps = {
  params: Promise<{ slug: string[] }>;
};

function buildPath(slug: string[]): string {
  return `/tools/${slug.join('/')}`;
}

export async function generateMetadata({
  params,
}: ToolsSectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const pathname = buildPath(slug);
  const title = getSectionTitle(pathname);

  return {
    title: `${title} — Инструменты по физике`,
    description:
      'Интерактивные инструменты и симуляции по физике для изучения и подготовки к ЕГЭ.',
    robots: { index: true, follow: true },
  };
}

export default async function ToolsSectionPage({ params }: ToolsSectionPageProps) {
  const { slug } = await params;
  const pathname = buildPath(slug);

  if (isToolsHome(pathname) || !isValidToolsPath(pathname)) {
    notFound();
  }

  const section = findNavItemByPath(pathname);

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-sm uppercase tracking-[0.35em] text-zinc-400">
          Инструменты
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">{section?.label}</h1>
      </header>

      <ToolsEmptyState sectionLabel={section?.label} />
    </div>
  );
}
