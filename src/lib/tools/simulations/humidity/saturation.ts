/**
 * Saturated steam properties for water, 0–100 °C.
 *
 * Source: IAPWS-95 formulation as tabulated by NIST Chemistry WebBook
 * (Thermophysical Properties of Fluid Systems — Water / steam tables),
 * saturation properties versus temperature.
 *
 * https://webbook.nist.gov/chemistry/fluid/
 * IAPWS R6-95(2018) / IAPWS-95 reference formulation.
 *
 * Units:
 * - T: °C
 * - pSat: kPa (absolute)
 * - rhoSat: kg/m³ (saturated vapor density)
 *
 * Between tabulated nodes we use log-linear interpolation for pSat and
 * rhoSat (appropriate for the exponential vapor-pressure curve).
 * Internal calculations keep full floating-point precision — display
 * rounding must not feed back into physics.
 */

export type SaturationNode = {
  tC: number;
  pSatKPa: number;
  rhoSatKgM3: number;
};

/**
 * Anchors from NIST/IAPWS saturation tables (0–100 °C).
 * Includes the educational checkpoints requested for the sim.
 */
export const SATURATION_TABLE: readonly SaturationNode[] = [
  { tC: 0, pSatKPa: 0.611657, rhoSatKgM3: 0.00485458 },
  { tC: 5, pSatKPa: 0.8726, rhoSatKgM3: 0.006797 },
  { tC: 10, pSatKPa: 1.2281, rhoSatKgM3: 0.009398 },
  { tC: 15, pSatKPa: 1.7057, rhoSatKgM3: 0.01283 },
  { tC: 20, pSatKPa: 2.3392, rhoSatKgM3: 0.01729 },
  { tC: 25, pSatKPa: 3.1699, rhoSatKgM3: 0.02305 },
  { tC: 30, pSatKPa: 4.2469, rhoSatKgM3: 0.03037 },
  { tC: 35, pSatKPa: 5.629, rhoSatKgM3: 0.0396 },
  { tC: 40, pSatKPa: 7.3849, rhoSatKgM3: 0.05115 },
  { tC: 45, pSatKPa: 9.593, rhoSatKgM3: 0.06544 },
  { tC: 50, pSatKPa: 12.352, rhoSatKgM3: 0.08302 },
  { tC: 55, pSatKPa: 15.758, rhoSatKgM3: 0.1044 },
  { tC: 60, pSatKPa: 19.941, rhoSatKgM3: 0.1302 },
  { tC: 65, pSatKPa: 25.022, rhoSatKgM3: 0.1612 },
  { tC: 70, pSatKPa: 31.201, rhoSatKgM3: 0.1981 },
  { tC: 75, pSatKPa: 38.595, rhoSatKgM3: 0.2418 },
  { tC: 80, pSatKPa: 47.414, rhoSatKgM3: 0.2933 },
  { tC: 85, pSatKPa: 57.868, rhoSatKgM3: 0.3535 },
  { tC: 90, pSatKPa: 70.182, rhoSatKgM3: 0.4235 },
  { tC: 95, pSatKPa: 84.55, rhoSatKgM3: 0.5045 },
  { tC: 100, pSatKPa: 101.325, rhoSatKgM3: 0.59774 },
] as const;

function clampTemperatureC(tC: number): number {
  if (!Number.isFinite(tC)) {
    return 0;
  }
  return Math.min(100, Math.max(0, tC));
}

function logLerp(a: number, b: number, t: number): number {
  const la = Math.log(Math.max(a, Number.MIN_VALUE));
  const lb = Math.log(Math.max(b, Number.MIN_VALUE));
  return Math.exp(la + (lb - la) * t);
}

function sampleSaturation(tC: number): SaturationNode {
  const t = clampTemperatureC(tC);
  const table = SATURATION_TABLE;

  if (t <= table[0]!.tC) {
    return { ...table[0]!, tC: t };
  }
  const last = table[table.length - 1]!;
  if (t >= last.tC) {
    return { ...last, tC: t };
  }

  let lo = 0;
  for (let i = 0; i < table.length - 1; i += 1) {
    if (t >= table[i]!.tC && t <= table[i + 1]!.tC) {
      lo = i;
      break;
    }
  }

  const a = table[lo]!;
  const b = table[lo + 1]!;
  const span = b.tC - a.tC;
  const frac = span <= 0 ? 0 : (t - a.tC) / span;

  return {
    tC: t,
    pSatKPa: logLerp(a.pSatKPa, b.pSatKPa, frac),
    rhoSatKgM3: logLerp(a.rhoSatKgM3, b.rhoSatKgM3, frac),
  };
}

/** Saturation vapor pressure Pнас(T) in kPa. */
export function saturationPressureKPa(temperatureC: number): number {
  return sampleSaturation(temperatureC).pSatKPa;
}

/** Saturated vapor density ρнас(T) in kg/m³. */
export function saturationDensityKgM3(temperatureC: number): number {
  return sampleSaturation(temperatureC).rhoSatKgM3;
}

/** Precomputed curve samples for the saturation graph (static SVG path). */
export function buildSaturationCurveSamples(
  stepC = 0.5,
): Array<{ tC: number; pSatKPa: number }> {
  const samples: Array<{ tC: number; pSatKPa: number }> = [];
  for (let t = 0; t <= 100 + 1e-9; t += stepC) {
    const clamped = Math.min(100, t);
    samples.push({
      tC: clamped,
      pSatKPa: saturationPressureKPa(clamped),
    });
  }
  return samples;
}
