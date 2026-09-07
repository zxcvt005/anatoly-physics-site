export type HumidityControlMode =
  | 'pressure'
  | 'density'
  | 'concentration'
  | 'mass';

export type HumidityPhase = 'unsaturated' | 'saturated' | 'with_liquid';

/**
 * User-facing controls. The active mode selects which of pressure /
 * density / concentration / mass is the independent vapor-substance
 * input. Temperature and volume are always independent.
 *
 * Requested values may exceed saturation — physics clamps vapor to
 * saturation and puts the excess into liquid water.
 */
export type HumidityParams = {
  temperatureC: number;
  volumeM3: number;
  controlMode: HumidityControlMode;
  /** Requested absolute pressure of vapor, kPa (may exceed Pнас). */
  pressureKPa: number;
  /** Requested vapor density, kg/m³ (may exceed ρнас). */
  densityKgM3: number;
  /** Requested molecular concentration, 1/m³ (may exceed nнас). */
  concentrationPerM3: number;
  /** Requested total H₂O mass (vapor + liquid), kg. */
  massKg: number;
};

export type HumiditySnapshot = {
  temperatureC: number;
  volumeM3: number;
  pSatKPa: number;
  rhoSatKgM3: number;
  nSatPerM3: number;
  vaporPressureKPa: number;
  vaporDensityKgM3: number;
  vaporConcentrationPerM3: number;
  vaporMassKg: number;
  liquidMassKg: number;
  totalMassKg: number;
  phase: HumidityPhase;
};

export type HumidityParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};
