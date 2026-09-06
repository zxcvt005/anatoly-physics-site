import type { Metadata } from 'next';
import { KinematicsEquationSimulation } from '@/components/tools/simulations/kinematics/KinematicsEquationSimulation';

export const metadata: Metadata = {
  title: 'Работа с уравнением — Инструменты по физике',
  description:
    'Интерактивная симуляция равноускоренного движения: уравнение x(t), графики координаты и скорости, движение по координатной прямой.',
  robots: { index: true, follow: true },
};

export default function KinematicsEquationToolPage() {
  return <KinematicsEquationSimulation />;
}
