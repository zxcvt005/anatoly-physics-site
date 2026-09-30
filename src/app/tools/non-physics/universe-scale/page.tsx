import type { Metadata } from 'next';
import { UniverseScaleTool } from '@/components/tools/size-scale/UniverseScaleTool';

export const metadata: Metadata = {
  title: 'Масштаб Вселенной — Инструменты по физике',
  description: 'Путешествие от протона до наблюдаемой Вселенной.',
  robots: { index: false, follow: false },
};

export default function UniverseScalePage() {
  return <UniverseScaleTool />;
}
