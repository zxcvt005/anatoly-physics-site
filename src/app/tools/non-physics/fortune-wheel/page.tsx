import type { Metadata } from 'next';
import { FortuneWheelTool } from '@/components/tools/fortune-wheel/FortuneWheelTool';

export const metadata: Metadata = {
  title: 'Колесо фортуны — Инструменты по физике',
  description:
    'Инструмент для проведения розыгрыша по количеству билетов с визуальным колесом и взвешенной вероятностью.',
  robots: { index: false, follow: false },
};

export default function FortuneWheelPage() {
  return <FortuneWheelTool />;
}
