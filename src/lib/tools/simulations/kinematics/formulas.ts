import type { SimulationFormulaLine } from '@/components/tools/simulations/SimulationFormulaBlock';
import type { KinematicsParams } from './types';
import { formatAcceleration, formatMeters, formatMetersPerSecond } from './physics';

export function getKinematicsFormulaLines(
  params: KinematicsParams,
): SimulationFormulaLine[] {
  return [
    {
      id: 'x-t',
      expression: 'x(t) = x₀ + v₀t + at²/2',
      note: `x₀ = ${formatMeters(params.x0)}, v₀ = ${formatMetersPerSecond(params.v0)}, a = ${formatAcceleration(params.a)}`,
    },
    {
      id: 'v-t',
      expression: 'v(t) = v₀ + at',
      note: 'Скорость меняется линейно при постоянном ускорении',
    },
  ];
}
