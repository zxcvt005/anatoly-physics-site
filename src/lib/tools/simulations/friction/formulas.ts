import type { FrictionForces, FrictionParams } from './types';
import { formatNumber } from './physics';

export type FormulaLine = {
  id: string;
  expression: string;
  note?: string;
};

export function getFrictionFormulaLines(
  params: FrictionParams,
  forces: FrictionForces,
): FormulaLine[] {
  const m = formatNumber(params.mass, params.mass % 1 === 0 ? 0 : 1);
  const mu = formatNumber(params.mu, 2);
  const g = formatNumber(params.gravity, Number.isInteger(params.gravity) ? 0 : 1);
  const n = formatNumber(forces.normal, 2);
  const fMax = formatNumber(forces.maxStaticFriction, 2);
  const fApplied = formatNumber(forces.appliedForce, 2);
  const fFriction = formatNumber(Math.abs(forces.friction), 2);
  const accel = formatNumber(forces.acceleration, 2);

  if (params.mode === 'horizontal') {
    const lines: FormulaLine[] = [
      {
        id: 'normal',
        expression: `N = mg = ${m} · ${g} = ${n} Н`,
      },
      {
        id: 'fmax',
        expression: `Fтр,max = μN = ${mu} · ${n} = ${fMax} Н`,
      },
    ];

    if (forces.isResting) {
      lines.push({
        id: 'static',
        expression: `Fтр = F = ${fApplied} Н`,
        note: 'трение покоя уравновешивает тягу',
      });
      lines.push({
        id: 'accel',
        expression: 'a = 0',
      });
    } else {
      lines.push({
        id: 'kinetic',
        expression: `Fтр = μN = ${fFriction} Н`,
        note: 'трение скольжения',
      });
      lines.push({
        id: 'net',
        expression: `Fрез = F − Fтр = ${fApplied} − ${fFriction} = ${formatNumber(forces.netForce, 2)} Н`,
      });
      lines.push({
        id: 'accel',
        expression: `a = Fрез / m = ${formatNumber(forces.netForce, 2)} / ${m} = ${accel} м/с²`,
      });
    }

    return lines;
  }

  const alpha = formatNumber(params.angleDeg, 0);
  const mgSin = formatNumber(forces.gravityAlong, 2);
  const mgCos = formatNumber(forces.gravityPerp, 2);

  const lines: FormulaLine[] = [
    {
      id: 'normal',
      expression: `N = mg cos α = ${m} · ${g} · cos ${alpha}° = ${n} Н`,
    },
    {
      id: 'along',
      expression: `mg sin α = ${m} · ${g} · sin ${alpha}° = ${mgSin} Н`,
    },
    {
      id: 'perp',
      expression: `mg cos α = ${mgCos} Н`,
    },
    {
      id: 'fmax',
      expression: `Fтр,max = μN = ${mu} · ${n} = ${fMax} Н`,
    },
  ];

  if (forces.isResting) {
    lines.push({
      id: 'static',
      expression: `Fтр = F + mg sin α = ${formatNumber(Math.abs(forces.friction), 2)} Н`,
      note: 'трение покоя, тело не скользит',
    });
    lines.push({
      id: 'condition',
      expression: `tan α ${forces.gravityAlong <= forces.maxStaticFriction + 1e-9 ? '≤' : '>'} μ`,
    });
    lines.push({
      id: 'accel',
      expression: 'a = 0',
    });
  } else {
    lines.push({
      id: 'kinetic',
      expression: `Fтр = μN = ${fFriction} Н`,
      note: 'трение скольжения',
    });
    lines.push({
      id: 'net',
      expression: `Fрез = F + mg sin α − Fтр = ${formatNumber(forces.netForce, 2)} Н`,
    });
    lines.push({
      id: 'accel',
      expression: `a = Fрез / m = ${accel} м/с²`,
    });
  }

  return lines;
}
