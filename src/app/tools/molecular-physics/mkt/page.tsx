import type { Metadata } from 'next';
import { MktSimulation } from '@/components/tools/simulations/mkt/MktSimulation';

export const metadata: Metadata = {
  title: 'МКТ: газ и молекулы — Инструменты по физике',
  description:
    'Интерактивная симуляция молекулярно-кинетической теории: сосуд с идеальным газом, температура, давление, объём и смесь газов.',
  robots: { index: true, follow: true },
};

export default function MktToolPage() {
  return <MktSimulation />;
}
