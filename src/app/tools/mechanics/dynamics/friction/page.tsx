import type { Metadata } from 'next';
import { FrictionSimulation } from '@/components/tools/simulations/friction/FrictionSimulation';

export const metadata: Metadata = {
  title: 'Сила трения — Инструменты по физике',
  description:
    'Интерактивная симуляция силы трения: трение покоя и скольжения на горизонтальной и наклонной плоскости.',
  robots: { index: true, follow: true },
};

export default function FrictionToolPage() {
  return <FrictionSimulation />;
}
