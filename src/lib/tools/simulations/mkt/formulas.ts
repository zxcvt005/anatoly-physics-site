import { R_GAS } from './constants';
import { getGasById } from './gases';
import {
  formatMoles,
  formatNumber,
  formatPressure,
  formatTemperatureK,
} from './physics';
import type { MktMacroState, MktParams } from './types';

export type FormulaLine = {
  id: string;
  expression: string;
  note?: string;
};

export function getMktFormulaLines(
  params: MktParams,
  macro: MktMacroState,
): FormulaLine[] {
  const nu = formatMoles(macro.totalMoles);
  const t = formatTemperatureK(macro.temperatureK).replace(' K', '');
  const vL = formatNumber(macro.volumeL, macro.volumeL % 1 === 0 ? 0 : 1);
  const vM3 = formatNumber(macro.volumeM3, 4);
  const p = formatPressure(macro.pressurePa);
  const r = formatNumber(R_GAS, 3);

  const lines: FormulaLine[] = [
    {
      id: 'ideal-gas',
      expression: `PV = νRT`,
      note: 'уравнение состояния идеального газа',
    },
    {
      id: 'pressure',
      expression: `P = νRT / V = ${nu} · ${r} · ${t} / ${vM3} = ${p}`,
      note: `V = ${vL} л = ${vM3} м³`,
    },
    {
      id: 'kinetic',
      expression: '⟨Eₖ⟩ = (3/2) kT',
      note: 'средняя кинетическая энергия поступательного движения',
    },
  ];

  if (params.components.length > 1) {
    lines.push({
      id: 'dalton',
      expression: 'P = Σ Pᵢ = (Σ νᵢ) RT / V',
      note: 'закон Дальтона для идеальной смеси',
    });
  }

  const primary = getGasById(params.components[0]?.gasId ?? 'n2');
  const mKg = primary.molarMassGPerMol / 1000;
  lines.push({
    id: 'rms',
    expression: `vᵣₘₛ = √(3RT / M)`,
    note: `для ${primary.formula}: M = ${formatNumber(mKg, 3)} кг/моль`,
  });

  return lines;
}
