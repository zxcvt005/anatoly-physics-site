import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolsCollectionView } from '@/components/tools/ToolsCollectionView';
import {
  findNavItemByPath,
  getCatchAllStaticSlugs,
  getSectionTitle,
  isToolsHome,
} from '@/lib/tools/navigation';

type ToolsSectionPageProps = {
  params: Promise<{ slug: string[] }>;
};

function buildPath(slug: string[]): string {
  return `/tools/${slug.join('/')}`;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getCatchAllStaticSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ToolsSectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const pathname = buildPath(slug);
  const item = findNavItemByPath(pathname);
  const title = item?.title ?? getSectionTitle(pathname);

  return {
    title: `${title} — Инструменты по физике`,
    description:
      item?.subtitle ??
      'Интерактивные инструменты и симуляции по физике для изучения и подготовки к ЕГЭ.',
    robots: { index: true, follow: true },
  };
}

export default async function ToolsSectionPage({ params }: ToolsSectionPageProps) {
  const { slug } = await params;
  const pathname = buildPath(slug);
  const item = findNavItemByPath(pathname);

  if (
    isToolsHome(pathname) ||
    !item ||
    item.type === 'home' ||
    item.type === 'tool'
  ) {
    notFound();
  }

  return <ToolsCollectionView item={item} />;
}
