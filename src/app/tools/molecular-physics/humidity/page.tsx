import type { Metadata } from 'next';
import { HumiditySimulation } from '@/components/tools/simulations/humidity/HumiditySimulation';

export const metadata: Metadata = {
  title: 'Влажность — Инструменты по физике',
  description:
    'Симуляция влажности: насыщенный водяной пар, конденсация и испарение в сосуде под поршнем.',
  robots: { index: false, follow: false },
};

export default function HumidityPage() {
  return <HumiditySimulation />;
}
