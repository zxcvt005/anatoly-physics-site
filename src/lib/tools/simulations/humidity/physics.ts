import {
  HUMIDITY_DEFAULT_PARAMS,
  HUMIDITY_RANGES,
  LIQUID_WATER_DENSITY,
  MAX_CUSTOM_RH_PERCENT,
  MAX_VISUAL_PARTICLES,
  MIN_CUSTOM_RH_PERCENT,
  MIN_VISUAL_PARTICLES,
  N_AVOGADRO,
  R_GAS,
  SLIDER_RH_FRACTION,
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
  HumidityPhaseMasses,
  HumidityProcessKind,
  HumiditySnapshot,
} from './types';

export type AdaptiveControlRange = {
  min: number;
  max: number;
  step: number;
};

export type AdaptiveControlRanges = {
  pressureKPa: AdaptiveControlRange;
  densityKgM3: AdaptiveControlRange;
  concentrationPerM3: AdaptiveControlRange;
  massKg: AdaptiveControlRange;
};

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function adaptiveStep(max: number): number {
  if (!Number.isFinite(max) || max <= 0) {
    return 1e-6;
  }
  const raw = max / 200;
  const exponent = Math.floor(Math.log10(raw));
  const base = 10 ** exponent;
  const mantissa = raw / base;
  const nice =
    mantissa <= 1 ? 1 : mantissa <= 2 ? 2 : mantissa <= 5 ? 5 : 10;
  return nice * base;
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
 * UI slider ranges for the four vapor controls at current T (and V for mass).
 * Max corresponds to RH = 180% via ρнас(T) / Pнас(T). Physics itself is not capped.
 */
export function getAdaptiveControlRanges(
  temperatureC: number,
  volumeM3: number,
): AdaptiveControlRanges {
  const T = clamp(
    finiteOr(temperatureC, HUMIDITY_DEFAULT_PARAMS.temperatureC),
    HUMIDITY_RANGES.temperatureC.min,
    HUMIDITY_RANGES.temperatureC.max,
  );
  const V = clampVolumeM3(
    finiteOr(volumeM3, HUMIDITY_DEFAULT_PARAMS.volumeM3),
  );

  const rhoSat = saturationDensityKgM3(T);
  const rhoMax = Math.max(SLIDER_RH_FRACTION * rhoSat, 1e-12);
  // P_max corresponds to ρ_max via ideal gas (≈ 1.8·Pнас from the table).
  const pMax = Math.max(pressureFromDensity(rhoMax, T), 1e-9);
  const massMax = Math.max(SLIDER_RH_FRACTION * rhoSat * V, 1e-12);
  const nMax = Math.max(concentrationFromDensity(rhoMax), 1e12);

  return {
    pressureKPa: { min: 0, max: pMax, step: adaptiveStep(pMax) },
    densityKgM3: { min: 0, max: rhoMax, step: adaptiveStep(rhoMax) },
    concentrationPerM3: { min: 0, max: nMax, step: adaptiveStep(nMax) },
    massKg: { min: 0, max: massMax, step: adaptiveStep(massMax) },
  };
}

/** Absolute vessel volume clamp: [V_min, 2 м³]. */
export function clampVolumeM3(volumeM3: number): number {
  return clamp(
    finiteOr(volumeM3, HUMIDITY_DEFAULT_PARAMS.volumeM3),
    HUMIDITY_RANGES.volumeM3.min,
    HUMIDITY_RANGES.volumeM3.max,
  );
}

export function clampCustomRelativeHumidityPercent(rhPercent: number): number {
  return clamp(
    finiteOr(rhPercent, 0),
    MIN_CUSTOM_RH_PERCENT,
    MAX_CUSTOM_RH_PERCENT,
  );
}

/**
 * Target vapor density / pressure / mass for a user-chosen RH at (T, V).
 * RH may exceed 100% (supersaturation). Does not clamp to the 180% UI slider cap.
 */
export function quantitiesForRelativeHumidity(
  relativeHumidityPercent: number,
  temperatureC: number,
  volumeM3: number,
): {
  relativeHumidityPercent: number;
  vaporDensityKgM3: number;
  vaporPressureKPa: number;
  vaporConcentrationPerM3: number;
  vaporMassKg: number;
} {
  const rh = clampCustomRelativeHumidityPercent(relativeHumidityPercent);
  const T = clamp(
    finiteOr(temperatureC, HUMIDITY_DEFAULT_PARAMS.temperatureC),
    HUMIDITY_RANGES.temperatureC.min,
    HUMIDITY_RANGES.temperatureC.max,
  );
  const V = clampVolumeM3(volumeM3);
  const fraction = rh / 100;
  const rhoSat = saturationDensityKgM3(T);
  const pSat = saturationPressureKPa(T);
  const vaporDensityKgM3 = Math.max(0, fraction * rhoSat);
  const vaporPressureKPa = Math.max(0, fraction * pSat);
  const vaporMassKg = Math.max(0, vaporDensityKgM3 * V);
  return {
    relativeHumidityPercent: rh,
    vaporDensityKgM3,
    vaporPressureKPa,
    vaporConcentrationPerM3: concentrationFromDensity(vaporDensityKgM3),
    vaporMassKg,
  };
}

/**
 * Build params that request the vapor state for the given RH.
 * Uses mass mode with m = ρ(RH)·V. Optionally caps mass by existingTotalMassKg
 * (no water created from nowhere — used when T/V change under sticky RH).
 */
export function paramsFromRelativeHumidity(
  current: HumidityParams,
  relativeHumidityPercent: number,
  options?: { existingTotalMassKg?: number },
): HumidityParams {
  const base = sanitizeParams(current);
  const quantities = quantitiesForRelativeHumidity(
    relativeHumidityPercent,
    base.temperatureC,
    base.volumeM3,
  );
  let massKg = quantities.vaporMassKg;
  if (
    options?.existingTotalMassKg !== undefined &&
    Number.isFinite(options.existingTotalMassKg)
  ) {
    massKg = Math.min(massKg, Math.max(0, options.existingTotalMassKg));
  }

  const V = Math.max(base.volumeM3, 1e-9);
  const densityKgM3 = massKg / V;
  const fullyAchieved =
    quantities.vaporMassKg <= 1e-15 || massKg >= quantities.vaporMassKg - 1e-15;

  return sanitizeParams({
    ...base,
    controlMode: 'mass',
    massKg,
    densityKgM3,
    pressureKPa: fullyAchieved
      ? quantities.vaporPressureKPa
      : pressureFromDensity(densityKgM3, base.temperatureC),
    concentrationPerM3: concentrationFromDensity(densityKgM3),
  });
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
 * Core equilibrium split (instant):
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
  const volumeM3 = clampVolumeM3(
    finiteOr(params.volumeM3, HUMIDITY_DEFAULT_PARAMS.volumeM3),
  );

  const totalMassKg = Math.max(
    0,
    requestedTotalMassKg({ ...params, temperatureC, volumeM3 }),
  );
  const masses: HumidityPhaseMasses = {
    vaporMassKg: Math.min(totalMassKg, saturationDensityKgM3(temperatureC) * volumeM3),
    liquidMassKg: 0,
  };
  masses.liquidMassKg = Math.max(0, totalMassKg - masses.vaporMassKg);

  return buildSnapshotFromMasses(params, masses, 'none', 0);
}

export function relativeHumidityPercent(
  vaporMassKg: number,
  volumeM3: number,
  temperatureC: number,
): number {
  const V = Math.max(volumeM3, 1e-9);
  const rhoSat = saturationDensityKgM3(temperatureC);
  if (rhoSat <= 1e-15) {
    return 0;
  }
  return (Math.max(0, vaporMassKg) / V / rhoSat) * 100;
}

export function createPhaseMasses(params: HumidityParams): HumidityPhaseMasses {
  const snap = resolveHumidityState(params);
  return {
    vaporMassKg: snap.vaporMassKg,
    liquidMassKg: snap.liquidMassKg,
  };
}

/**
 * Start with all water as vapor so a sudden V drop can supersaturate
 * (RH > 100%) before condensation runs.
 */
export function createPhaseMassesAllVapor(params: HumidityParams): HumidityPhaseMasses {
  const total = Math.max(0, requestedTotalMassKg(sanitizeParams(params)));
  return { vaporMassKg: total, liquidMassKg: 0 };
}

/** Keep m_vapor + m_liquid = totalMass; add/remove from vapor first. */
export function reconcilePhaseMasses(
  masses: HumidityPhaseMasses,
  totalMassKg: number,
): HumidityPhaseMasses {
  const total = Math.max(0, finiteOr(totalMassKg, 0));
  let vapor = Math.max(0, finiteOr(masses.vaporMassKg, 0));
  let liquid = Math.max(0, finiteOr(masses.liquidMassKg, 0));
  const current = vapor + liquid;
  const delta = total - current;

  if (delta > 1e-15) {
    vapor += delta;
  } else if (delta < -1e-15) {
    let need = -delta;
    const fromVapor = Math.min(vapor, need);
    vapor -= fromVapor;
    need -= fromVapor;
    liquid = Math.max(0, liquid - need);
  }

  vapor = Math.max(0, vapor);
  liquid = Math.max(0, total - vapor);
  return { vaporMassKg: vapor, liquidMassKg: liquid };
}

export function equilibriumTargets(
  params: HumidityParams,
  totalMassKg: number,
): HumidityPhaseMasses {
  const temperatureC = clamp(
    finiteOr(params.temperatureC, 20),
    HUMIDITY_RANGES.temperatureC.min,
    HUMIDITY_RANGES.temperatureC.max,
  );
  const volumeM3 = clampVolumeM3(finiteOr(params.volumeM3, 1));
  const total = Math.max(0, totalMassKg);
  const maxVapor = saturationDensityKgM3(temperatureC) * volumeM3;
  const vaporMassKg = Math.min(total, maxVapor);
  return {
    vaporMassKg,
    liquidMassKg: Math.max(0, total - vaporMassKg),
  };
}

export const PHASE_TRANSITION_SECONDS = 1.0;

/**
 * Gradual phase transition toward saturation equilibrium.
 * Conserves m_vapor + m_liquid = totalMassKg.
 */
export function stepPhaseMasses(
  masses: HumidityPhaseMasses,
  params: HumidityParams,
  dt: number,
  tauSeconds = PHASE_TRANSITION_SECONDS,
): { masses: HumidityPhaseMasses; process: HumidityProcessKind; intensity: number } {
  const safeParams = sanitizeParams(params);
  const total = Math.max(0, requestedTotalMassKg(safeParams));
  let next = reconcilePhaseMasses(masses, total);
  const target = equilibriumTargets(safeParams, total);
  const rate = 1 - Math.exp(-Math.max(0, dt) / Math.max(tauSeconds * 0.45, 0.05));

  const prevVapor = next.vaporMassKg;
  next = {
    vaporMassKg: prevVapor + (target.vaporMassKg - prevVapor) * rate,
    liquidMassKg: 0,
  };
  next.liquidMassKg = Math.max(0, total - next.vaporMassKg);
  next.vaporMassKg = Math.max(0, Math.min(next.vaporMassKg, total));
  next.liquidMassKg = Math.max(0, total - next.vaporMassKg);

  const err = next.vaporMassKg - target.vaporMassKg;
  const scale = Math.max(
    total * 0.08,
    target.vaporMassKg * 0.05,
    1e-6,
  );
  let process: HumidityProcessKind = 'none';
  let intensity = 0;

  if (err > 1e-7) {
    process = 'condense';
    intensity = clamp(err / scale, 0, 1);
  } else if (err < -1e-7 && next.liquidMassKg > 1e-9) {
    process = 'evaporate';
    intensity = clamp(-err / scale, 0, 1);
  }

  if (Math.abs(err) < 1e-6) {
    next = { ...target };
    process = 'none';
    intensity = 0;
  }

  return { masses: next, process, intensity };
}

export function buildSnapshotFromMasses(
  params: HumidityParams,
  masses: HumidityPhaseMasses,
  process: HumidityProcessKind = 'none',
  processIntensity = 0,
): HumiditySnapshot {
  const temperatureC = clamp(
    finiteOr(params.temperatureC, HUMIDITY_DEFAULT_PARAMS.temperatureC),
    HUMIDITY_RANGES.temperatureC.min,
    HUMIDITY_RANGES.temperatureC.max,
  );
  const volumeM3 = clampVolumeM3(
    finiteOr(params.volumeM3, HUMIDITY_DEFAULT_PARAMS.volumeM3),
  );

  const pSatKPa = saturationPressureKPa(temperatureC);
  const rhoSatKgM3 = saturationDensityKgM3(temperatureC);
  const nSatPerM3 = concentrationFromDensity(rhoSatKgM3);

  const totalMassKg = Math.max(0, masses.vaporMassKg + masses.liquidMassKg);
  const vaporMassKg = Math.max(0, Math.min(masses.vaporMassKg, totalMassKg));
  const liquidMassKg = Math.max(0, totalMassKg - vaporMassKg);
  const vaporDensityKgM3 = vaporMassKg / Math.max(volumeM3, 1e-9);
  const vaporConcentrationPerM3 = concentrationFromDensity(vaporDensityKgM3);
  const rh = relativeHumidityPercent(vaporMassKg, volumeM3, temperatureC);

  // Supersaturated: ideal-gas P can exceed Pнас.
  // At/near saturation (with or without liquid): use table Pнас.
  const supersaturated = vaporDensityKgM3 > rhoSatKgM3 * 1.002;
  const atSaturation =
    !supersaturated && vaporDensityKgM3 >= rhoSatKgM3 * (1 - 1e-6);
  const vaporPressureKPa =
    supersaturated
      ? pressureFromDensity(vaporDensityKgM3, temperatureC)
      : atSaturation || liquidMassKg > 1e-12
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
    relativeHumidityPercent: rh,
    process,
    processIntensity: clamp(processIntensity, 0, 1),
  };
}

export function sanitizeParams(input: Partial<HumidityParams>): HumidityParams {
  const temperatureC = clamp(
    finiteOr(input.temperatureC ?? HUMIDITY_DEFAULT_PARAMS.temperatureC, HUMIDITY_DEFAULT_PARAMS.temperatureC),
    HUMIDITY_RANGES.temperatureC.min,
    HUMIDITY_RANGES.temperatureC.max,
  );
  const volumeM3 = clampVolumeM3(
    finiteOr(input.volumeM3 ?? HUMIDITY_DEFAULT_PARAMS.volumeM3, HUMIDITY_DEFAULT_PARAMS.volumeM3),
  );

  const mode: HumidityControlMode =
    input.controlMode === 'pressure' ||
    input.controlMode === 'density' ||
    input.controlMode === 'concentration' ||
    input.controlMode === 'mass'
      ? input.controlMode
      : HUMIDITY_DEFAULT_PARAMS.controlMode;

  // Absolute safety caps only — adaptive 180% RH limits are UI/slider bounds.
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
  // (or total mass for mass mode). Absolute caps only — UI adaptive clamp
  // is applied separately when T/V change.
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

/** Clamp control fields to the adaptive UI max (RH = 180% at current T, V). */
export function clampParamsToAdaptiveRanges(params: HumidityParams): HumidityParams {
  const ranges = getAdaptiveControlRanges(params.temperatureC, params.volumeM3);
  return sanitizeParams({
    ...params,
    pressureKPa: clamp(params.pressureKPa, ranges.pressureKPa.min, ranges.pressureKPa.max),
    densityKgM3: clamp(params.densityKgM3, ranges.densityKgM3.min, ranges.densityKgM3.max),
    concentrationPerM3: clamp(
      params.concentrationPerM3,
      ranges.concentrationPerM3.min,
      ranges.concentrationPerM3.max,
    ),
    massKg: clamp(params.massKg, ranges.massKg.min, ranges.massKg.max),
  });
}

export function patchParams(
  current: HumidityParams,
  partial: Partial<HumidityParams>,
): HumidityParams {
  const merged = sanitizeParams({ ...current, ...partial });

  // When volume or temperature changes: keep independent control if still
  // in range, else clamp to adaptive UI max (RH = 180%); sync sibling fields.
  if (partial.volumeM3 !== undefined || partial.temperatureC !== undefined) {
    return clampParamsToAdaptiveRanges(
      syncControlFields(merged, resolveHumidityState(merged)),
    );
  }

  if (partial.controlMode !== undefined && partial.controlMode !== current.controlMode) {
    // Switching mode: snapshot current total mass into the new independent field.
    const snap = resolveHumidityState(current);
    const ranges = getAdaptiveControlRanges(merged.temperatureC, merged.volumeM3);
    const seeded = { ...merged };
    if (partial.controlMode === 'pressure') {
      seeded.pressureKPa = clamp(
        snap.liquidMassKg > 0
          ? pressureFromDensity(snap.totalMassKg / snap.volumeM3, snap.temperatureC)
          : snap.vaporPressureKPa,
        ranges.pressureKPa.min,
        ranges.pressureKPa.max,
      );
    } else if (partial.controlMode === 'density') {
      seeded.densityKgM3 = clamp(
        snap.totalMassKg / snap.volumeM3,
        ranges.densityKgM3.min,
        ranges.densityKgM3.max,
      );
    } else if (partial.controlMode === 'concentration') {
      seeded.concentrationPerM3 = clamp(
        concentrationFromDensity(snap.totalMassKg / snap.volumeM3),
        ranges.concentrationPerM3.min,
        ranges.concentrationPerM3.max,
      );
    } else if (partial.controlMode === 'mass') {
      seeded.massKg = clamp(
        snap.totalMassKg,
        ranges.massKg.min,
        ranges.massKg.max,
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
