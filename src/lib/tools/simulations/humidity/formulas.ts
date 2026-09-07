import type { SimulationFormulaLine } from '@/components/tools/simulations/SimulationFormulaBlock';

export function getHumidityFormulas(): SimulationFormulaLine[] {
  return [
    {
      id: 'psat',
      expression: 'Pнас = Pнас(T)',
      note: 'таблица насыщения NIST / IAPWS-95',
    },
    {
      id: 'ideal',
      expression: 'P = ρRT / M',
      note: 'ненасыщенный водяной пар',
    },
    {
      id: 'conc',
      expression: 'n = (ρ / M) · N_A',
    },
    {
      id: 'split',
      expression: 'mпар = min(m, ρнас·V)',
      note: 'избыток → жидкая вода',
    },
  ];
}
