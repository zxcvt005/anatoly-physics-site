import {
  HUMIDITY_DEFAULT_PARAMS,
  HUMIDITY_RANGES,
  LIQUID_WATER_DENSITY,
  MAX_VISUAL_PARTICLES,
  MIN_VISUAL_PARTICLES,
  N_AVOGADRO,
  R_GAS,
  WATER_MOLAR_MASS,
  ZERO_CELSIUS_IN_KELVIN,
} from './constants';
import {
  saturationDensityKgM3,
  saturationPressureKPa,
} from './saturation';
import type {
  HumidityControlMode,
  HumidityParams,
  HumidityParticle,
  HumidityPhase,
  HumiditySnapshot,
} from './types';

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function celsiusToKelvin(tC: number): number {
  return finiteOr(tC, 0) + ZERO_CELSIUS_IN_KELVIN;
}

export function densityFromPressure(
  pressureKPa: number,
  temperatureC: number,
): number {
  const T = celsiusToKelvin(temperatureC);
  if (T <= 0) {
    return 0;
  }
  const pPa = Math.max(0, finiteOr(pressureKPa, 0)) * 1000;
  return (pPa * WATER_MOLAR_MASS) / (R_GAS * T);
}

export function pressureFromDensity(
  densityKgM3: number,
  temperatureC: number,
): number {
  const T = celsiusToKelvin(temperatureC);
  const rho = Math.max(0, finiteOr(densityKgM3, 0));
  const pPa = (rho * R_GAS * T) / WATER_MOLAR_MASS;
  return pPa / 1000;
}

/** Molecular concentration n = ρ/M · N_A  [1/m³]. */
export function concentrationFromDensity(densityKgM3: number): number {
  const rho = Math.max(0, finiteOr(densityKgM3, 0));
  return (rho / WATER_MOLAR_MASS) * N_AVOGADRO;
}

export function densityFromConcentration(concentrationPerM3: number): number {
  const n = Math.max(0, finiteOr(concentrationPerM3, 0));
  return (n * WATER_MOLAR_MASS) / N_AVOGADRO;
}

export function saturationConcentrationPerM3(temperatureC: number): number {
  return concentrationFromDensity(saturationDensityKgM3(temperatureC));
}

/**
 * Resolve the user-requested total H₂O mass (vapor + liquid intent)
 * from the active independent control, without clamping to saturation.
 */
export function requestedTotalMassKg(params: HumidityParams): number {
  const V = Math.max(1e-9, params.volumeM3);

  switch (params.controlMode) {
    case 'pressure': {
      const rho = densityFromPressure(params.pressureKPa, params.temperatureC);
      return rho * V;
    }
    case 'density':
      return Math.max(0, params.densityKgM3) * V;
    case 'concentration': {
      const rho = densityFromConcentration(params.concentrationPerM3);
      return rho * V;
    }
    case 'mass':
      return Math.max(0, params.massKg);
    default:
      return Math.max(0, params.massKg);
  }
}

function phaseOf(liquidMassKg: number, vaporDensity: number, rhoSat: number): HumidityPhase {
  if (liquidMassKg > 1e-12) {
    return 'with_liquid';
  }
  if (vaporDensity >= rhoSat * (1 - 1e-9)) {
    return 'saturated';
  }
  return 'unsaturated';
}

/**
 * Core saturation split:
 * m_vapor = min(m_total, ρнас·V)
 * m_liquid = max(0, m_total − m_vapor)
 * For vapor: P = Pнас when saturated/with liquid, else ideal-gas P(ρ,T).
 */
export function resolveHumidityState(params: HumidityParams): HumiditySnapshot {
  const temperatureC = clamp(
    finiteOr(params.temperatureC, HUMIDITY_DEFAULT_PARAMS.temperatureC),
    HUMIDITY_RANGES.temperatureC.min,
    HUMIDITY_RANGES.temperatureC.max,
  );
  const volumeM3 = clamp(
    finiteOr(params.volumeM3, HUMIDITY_DEFAULT_PARAMS.volumeM3),
    HUMIDITY_RANGES.volumeM3.min,
    HUMIDITY_RANGES.volumeM3.max,
  );

  const pSatKPa = saturationPressureKPa(temperatureC);
  const rhoSatKgM3 = saturationDensityKgM3(temperatureC);
  const nSatPerM3 = concentrationFromDensity(rhoSatKgM3);

  const totalMassKg = Math.max(0, requestedTotalMassKg({ ...params, temperatureC, volumeM3 }));
  const maxVaporMass = rhoSatKgM3 * volumeM3;
  const vaporMassKg = Math.min(totalMassKg, maxVaporMass);
  const liquidMassKg = Math.max(0, totalMassKg - vaporMassKg);
  const vaporDensityKgM3 = vaporMassKg / volumeM3;
  const vaporConcentrationPerM3 = concentrationFromDensity(vaporDensityKgM3);
  const saturated = liquidMassKg > 1e-12 || vaporDensityKgM3 >= rhoSatKgM3 * (1 - 1e-9);
  const vaporPressureKPa = saturated
    ? pSatKPa
    : pressureFromDensity(vaporDensityKgM3, temperatureC);

  return {
    temperatureC,
    volumeM3,
    pSatKPa,
    rhoSatKgM3,
    nSatPerM3,
    vaporPressureKPa,
    vaporDensityKgM3,
    vaporConcentrationPerM3,
    vaporMassKg,
    liquidMassKg,
    totalMassKg,
    phase: phaseOf(liquidMassKg, vaporDensityKgM3, rhoSatKgM3),
  };
}

export function sanitizeParams(input: Partial<HumidityParams>): HumidityParams {
  const temperatureC = clamp(
    finiteOr(input.temperatureC ?? HUMIDITY_DEFAULT_PARAMS.temperatureC, HUMIDITY_DEFAULT_PARAMS.temperatureC),
    HUMIDITY_RANGES.temperatureC.min,
    HUMIDITY_RANGES.temperatureC.max,
  );
  const volumeM3 = clamp(
    finiteOr(input.volumeM3 ?? HUMIDITY_DEFAULT_PARAMS.volumeM3, HUMIDITY_DEFAULT_PARAMS.volumeM3),
    HUMIDITY_RANGES.volumeM3.min,
    HUMIDITY_RANGES.volumeM3.max,
  );

  const mode: HumidityControlMode =
    input.controlMode === 'pressure' ||
    input.controlMode === 'density' ||
    input.controlMode === 'concentration' ||
    input.controlMode === 'mass'
      ? input.controlMode
      : HUMIDITY_DEFAULT_PARAMS.controlMode;

  const pressureKPa = clamp(
    finiteOr(input.pressureKPa ?? HUMIDITY_DEFAULT_PARAMS.pressureKPa, HUMIDITY_DEFAULT_PARAMS.pressureKPa),
    HUMIDITY_RANGES.pressureKPa.min,
    HUMIDITY_RANGES.pressureKPa.max,
  );
  const densityKgM3 = clamp(
    finiteOr(input.densityKgM3 ?? HUMIDITY_DEFAULT_PARAMS.densityKgM3, HUMIDITY_DEFAULT_PARAMS.densityKgM3),
    HUMIDITY_RANGES.densityKgM3.min,
    HUMIDITY_RANGES.densityKgM3.max,
  );
  const concentrationPerM3 = clamp(
    finiteOr(
      input.concentrationPerM3 ?? HUMIDITY_DEFAULT_PARAMS.concentrationPerM3,
      HUMIDITY_DEFAULT_PARAMS.concentrationPerM3,
    ),
    HUMIDITY_RANGES.concentrationPerM3.min,
    HUMIDITY_RANGES.concentrationPerM3.max,
  );
  const massKg = clamp(
    finiteOr(input.massKg ?? HUMIDITY_DEFAULT_PARAMS.massKg, HUMIDITY_DEFAULT_PARAMS.massKg),
    HUMIDITY_RANGES.massKg.min,
    HUMIDITY_RANGES.massKg.max,
  );

  return {
    temperatureC,
    volumeM3,
    controlMode: mode,
    pressureKPa,
    densityKgM3,
    concentrationPerM3,
    massKg,
  };
}

/**
 * Keep the four control fields mutually consistent with the active mode
 * and the resolved physical state (so switching mode feels continuous).
 */
export function syncControlFields(
  params: HumidityParams,
  snapshot: HumiditySnapshot = resolveHumidityState(params),
): HumidityParams {
  const next = { ...params };
  // Displayed / editable fields track the *requested* independent quantity
  // for the active mode, but inactive fields mirror the physical vapor state
  // (or total mass for mass mode).
  if (params.controlMode !== 'pressure') {
    next.pressureKPa = clamp(
      snapshot.vaporPressureKPa,
      HUMIDITY_RANGES.pressureKPa.min,
      HUMIDITY_RANGES.pressureKPa.max,
    );
  }
  if (params.controlMode !== 'density') {
    next.densityKgM3 = clamp(
      snapshot.vaporDensityKgM3 + snapshot.liquidMassKg / Math.max(snapshot.volumeM3, 1e-9),
      HUMIDITY_RANGES.densityKgM3.min,
      HUMIDITY_RANGES.densityKgM3.max,
    );
    // For density display of "requested" when liquid present: use total/V
    // so the slider shows the value that recreates the same split.
  }
  if (params.controlMode !== 'concentration') {
    const rhoTotal =
      snapshot.totalMassKg / Math.max(snapshot.volumeM3, 1e-9);
    next.concentrationPerM3 = clamp(
      concentrationFromDensity(rhoTotal),
      HUMIDITY_RANGES.concentrationPerM3.min,
      HUMIDITY_RANGES.concentrationPerM3.max,
    );
  }
  if (params.controlMode !== 'mass') {
    next.massKg = clamp(
      snapshot.totalMassKg,
      HUMIDITY_RANGES.massKg.min,
      HUMIDITY_RANGES.massKg.max,
    );
  }
  return sanitizeParams(next);
}

export function patchParams(
  current: HumidityParams,
  partial: Partial<HumidityParams>,
): HumidityParams {
  const merged = sanitizeParams({ ...current, ...partial });

  // When volume or temperature changes under a non-mass mode, keep the
  // independent control value and let mass float. Under mass mode, mass
  // is fixed and densities float with V.
  if (partial.volumeM3 !== undefined || partial.temperatureC !== undefined) {
    if (merged.controlMode === 'mass') {
      return syncControlFields(merged, resolveHumidityState(merged));
    }
    return syncControlFields(merged, resolveHumidityState(merged));
  }

  if (partial.controlMode !== undefined && partial.controlMode !== current.controlMode) {
    // Switching mode: snapshot current total mass into the new independent field.
    const snap = resolveHumidityState(current);
    const seeded = { ...merged };
    if (partial.controlMode === 'pressure') {
      seeded.pressureKPa = clamp(
        snap.liquidMassKg > 0
          ? pressureFromDensity(snap.totalMassKg / snap.volumeM3, snap.temperatureC)
          : snap.vaporPressureKPa,
        HUMIDITY_RANGES.pressureKPa.min,
        HUMIDITY_RANGES.pressureKPa.max,
      );
    } else if (partial.controlMode === 'density') {
      seeded.densityKgM3 = clamp(
        snap.totalMassKg / snap.volumeM3,
        HUMIDITY_RANGES.densityKgM3.min,
        HUMIDITY_RANGES.densityKgM3.max,
      );
    } else if (partial.controlMode === 'concentration') {
      seeded.concentrationPerM3 = clamp(
        concentrationFromDensity(snap.totalMassKg / snap.volumeM3),
        HUMIDITY_RANGES.concentrationPerM3.min,
        HUMIDITY_RANGES.concentrationPerM3.max,
      );
    } else if (partial.controlMode === 'mass') {
      seeded.massKg = clamp(
        snap.totalMassKg,
        HUMIDITY_RANGES.massKg.min,
        HUMIDITY_RANGES.massKg.max,
      );
    }
    return syncControlFields(sanitizeParams(seeded));
  }

  return syncControlFields(merged);
}

export function createHumiditySnapshot(params: HumidityParams): HumiditySnapshot {
  return resolveHumidityState(sanitizeParams(params));
}

/** Visual particle count from vapor mass (not real molecule count). */
export function vaporMassToVisualCount(vaporMassKg: number, volumeM3: number): number {
  if (!Number.isFinite(vaporMassKg) || vaporMassKg <= 1e-9) {
    return 0;
  }
  const rho = vaporMassKg / Math.max(volumeM3, 1e-9);
  // Reference: ρнас(20 °C) ≈ 0.0173 maps near mid visual range.
  const fraction = rho / 0.0173;
  const count = Math.round(
    MIN_VISUAL_PARTICLES + fraction * (MAX_VISUAL_PARTICLES - MIN_VISUAL_PARTICLES),
  );
  return clamp(count, MIN_VISUAL_PARTICLES, MAX_VISUAL_PARTICLES);
}

/** Liquid layer height as fraction of gas column (visual only). */
export function liquidHeightFraction(liquidMassKg: number, volumeM3: number): number {
  if (liquidMassKg <= 1e-12) {
    return 0;
  }
  const liquidVolume = liquidMassKg / LIQUID_WATER_DENSITY;
  const fraction = liquidVolume / Math.max(volumeM3, 1e-9);
  // Amplify so small condensed masses stay clearly visible.
  return clamp(0.045 + fraction * 70, 0.045, 0.42);
}

/** Duration of visual condensation / evaporation transition (seconds). */
export const PHASE_TRANSITION_SECONDS = 1.0;

export function createParticles(
  count: number,
  width: number,
  height: number,
  seed = 1,
): HumidityParticle[] {
  const particles: HumidityParticle[] = [];
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  for (let i = 0; i < count; i += 1) {
    const angle = rnd() * Math.PI * 2;
    const speed = 40 + rnd() * 80;
    particles.push({
      x: rnd() * width,
      y: rnd() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }
  return particles;
}

export function syncParticles(
  particles: HumidityParticle[],
  count: number,
  width: number,
  height: number,
): HumidityParticle[] {
  const next = particles.slice(0, count);
  while (next.length < count) {
    const extra = createParticles(1, width, height, next.length + 7);
    next.push(extra[0]!);
  }
  for (const p of next) {
    p.x = clamp(p.x, 0, width);
    p.y = clamp(p.y, 0, height);
  }
  return next;
}

export function stepParticles(
  particles: HumidityParticle[],
  dt: number,
  width: number,
  height: number,
  radius = 3.2,
): void {
  const safeDt = Math.min(Math.max(dt, 0), 1 / 20);
  for (const p of particles) {
    p.x += p.vx * safeDt;
    p.y += p.vy * safeDt;

    if (p.x < radius) {
      p.x = radius;
      p.vx = Math.abs(p.vx);
    } else if (p.x > width - radius) {
      p.x = width - radius;
      p.vx = -Math.abs(p.vx);
    }

    if (p.y < radius) {
      p.y = radius;
      p.vy = Math.abs(p.vy);
    } else if (p.y > height - radius) {
      p.y = height - radius;
      p.vy = -Math.abs(p.vy);
    }
  }
}

export function formatHumidityNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  if (Math.abs(value) >= 1e4 || (Math.abs(value) > 0 && Math.abs(value) < 1e-3)) {
    return value.toExponential(2);
  }
  const fixed = value.toFixed(digits);
  return Number(fixed).toString();
}

export function phaseLabel(phase: HumidityPhase): string {
  switch (phase) {
    case 'unsaturated':
      return 'Ненасыщенный пар';
    case 'saturated':
      return 'Насыщенный пар';
    case 'with_liquid':
      return 'Есть жидкая вода';
    default:
      return 'Ненасыщенный пар';
  }
}
