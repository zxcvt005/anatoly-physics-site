export type IdealGasDefinition = {
  id: string;
  name: string;
  formula: string;
  /** Molar mass in g/mol */
  molarMassGPerMol: number;
  /** CSS color for visual molecules */
  color: string;
};

/**
 * Ideal-gas reference used by the MKT simulation.
 * Extend this list to add more gases without touching UI logic.
 */
export const IDEAL_GASES: readonly IdealGasDefinition[] = [
  {
    id: 'h2',
    name: 'Водород',
    formula: 'H₂',
    molarMassGPerMol: 2,
    color: '#7dd3fc',
  },
  {
    id: 'he',
    name: 'Гелий',
    formula: 'He',
    molarMassGPerMol: 4,
    color: '#a5b4fc',
  },
  {
    id: 'ne',
    name: 'Неон',
    formula: 'Ne',
    molarMassGPerMol: 20,
    color: '#f9a8d4',
  },
  {
    id: 'n2',
    name: 'Азот',
    formula: 'N₂',
    molarMassGPerMol: 28,
    color: '#60a5fa',
  },
  {
    id: 'o2',
    name: 'Кислород',
    formula: 'O₂',
    molarMassGPerMol: 32,
    color: '#f87171',
  },
  {
    id: 'ar',
    name: 'Аргон',
    formula: 'Ar',
    molarMassGPerMol: 40,
    color: '#c4b5fd',
  },
  {
    id: 'co2',
    name: 'Углекислый газ',
    formula: 'CO₂',
    molarMassGPerMol: 44,
    color: '#94a3b8',
  },
  {
    id: 'kr',
    name: 'Криптон',
    formula: 'Kr',
    molarMassGPerMol: 84,
    color: '#fbbf24',
  },
] as const;

export const DEFAULT_GAS_ID = 'n2';

const gasById = new Map(IDEAL_GASES.map((gas) => [gas.id, gas]));

export function getGasById(id: string): IdealGasDefinition {
  return gasById.get(id) ?? IDEAL_GASES.find((g) => g.id === DEFAULT_GAS_ID)!;
}

export function formatGasOptionLabel(gas: IdealGasDefinition): string {
  return `${gas.name} — ${gas.formula} — ${gas.molarMassGPerMol} г/моль`;
}

export function molarMassKgPerMol(gas: IdealGasDefinition): number {
  return gas.molarMassGPerMol / 1000;
}
