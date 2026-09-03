import {
  FRICTION_DEFAULT_PARAMS,
  FRICTION_RANGES,
  MASS_VISUAL_SCALE,
} from './constants';
import { clamp, finiteNumber } from '../math';

export function massToVisualScale(mass: number): number {
  const minMass = FRICTION_RANGES.mass.min;
  const maxMass = FRICTION_RANGES.mass.max;
  const baseMass = FRICTION_DEFAULT_PARAMS.mass;
  const value = clamp(finiteNumber(mass, baseMass), minMass, maxMass);

  if (value <= baseMass) {
    const t = (value - minMass) / (baseMass - minMass);
    return MASS_VISUAL_SCALE.min + t * (1 - MASS_VISUAL_SCALE.min);
  }

  const t = (value - baseMass) / (maxMass - baseMass);
  return 1 + t * (MASS_VISUAL_SCALE.max - 1);
}
