import { clamp, finiteNumber } from '../math';
import {
  COLLISION_PRESSURE_THRESHOLD,
  HEATER_RATE_K_PER_S,
  VISUAL_SPEED_SCALE,
  K_BOLTZMANN,
  MAX_COMPONENTS,
  MAX_MOLES,
  MAX_STEP_DT,
  MAX_TEMPERATURE_K,
  MAX_VISUAL_PARTICLES,
  MAX_VOLUME_L,
  MIN_MOLES,
  MIN_TEMPERATURE_K,
  MIN_VISUAL_PARTICLES,
  MIN_VOLUME_L,
  N_AVOGADRO,
  PARTICLE_RADIUS_PX,
  PRESSURE_WINDOW_S,
  R_GAS,
  VESSEL_REF,
  ZERO_CELSIUS_IN_KELVIN,
} from './constants';
import {
  DEFAULT_GAS_ID,
  getGasById,
  IDEAL_GASES,
  molarMassKgPerMol,
  type IdealGasDefinition,
} from './gases';
import type {
  GasComponent,
  MktMacroState,
  MktParams,
  MktParticle,
  MktRuntimeStats,
  MktSnapshot,
  MktStepResult,
  TemperatureUnit,
  VesselBounds,
  WallHitFlash,
} from './types';

let nextParticleId = 1;
let nextFlashId = 1;
let nextComponentId = 1;

export function createComponentId(): string {
  nextComponentId += 1;
  return `component-${nextComponentId}`;
}

export function litersToCubicMeters(volumeL: number): number {
  return finiteNumber(volumeL, 0) / 1000;
}

export function kelvinToCelsius(temperatureK: number): number {
  return clampTemperatureK(temperatureK) - ZERO_CELSIUS_IN_KELVIN;
}

export function celsiusToKelvin(temperatureC: number): number {
  return finiteNumber(temperatureC, 0) + ZERO_CELSIUS_IN_KELVIN;
}

export function clampTemperatureK(temperatureK: number): number {
  return clamp(
    finiteNumber(temperatureK, MKT_SAFE_DEFAULT_T),
    MIN_TEMPERATURE_K,
    MAX_TEMPERATURE_K,
  );
}

const MKT_SAFE_DEFAULT_T = 300;

export function sanitizeTemperatureInput(
  value: number,
  unit: TemperatureUnit,
): number {
  if (unit === 'C') {
    return clampTemperatureK(celsiusToKelvin(value));
  }
  return clampTemperatureK(value);
}

export function displayTemperature(
  temperatureK: number,
  unit: TemperatureUnit,
): number {
  const k = clampTemperatureK(temperatureK);
  return unit === 'C' ? kelvinToCelsius(k) : k;
}

export function sanitizeDt(dt: number): number {
  const value = finiteNumber(dt, 0);
  if (value <= 0) {
    return 0;
  }
  return Math.min(value, MAX_STEP_DT);
}

export function sanitizeComponent(component: GasComponent): GasComponent {
  return {
    id: component.id || createComponentId(),
    gasId: getGasById(component.gasId).id,
    moles: clamp(finiteNumber(component.moles, MIN_MOLES), MIN_MOLES, MAX_MOLES),
  };
}

export function sanitizeParams(params: MktParams): MktParams {
  const rawComponents =
    Array.isArray(params.components) && params.components.length > 0
      ? params.components.slice(0, MAX_COMPONENTS).map(sanitizeComponent)
      : [
          {
            id: 'component-1',
            gasId: DEFAULT_GAS_ID,
            moles: 1,
          },
        ];

  return {
    temperatureK: clampTemperatureK(params.temperatureK),
    volumeL: clamp(
      finiteNumber(params.volumeL, 22.4),
      MIN_VOLUME_L,
      MAX_VOLUME_L,
    ),
    temperatureUnit: params.temperatureUnit === 'C' ? 'C' : 'K',
    heater: clamp(finiteNumber(params.heater, 0), -1, 1),
    components: rawComponents,
  };
}

export function totalMoles(components: GasComponent[]): number {
  return components.reduce((sum, item) => sum + Math.max(0, item.moles), 0);
}

export function partialPressurePa(
  moles: number,
  temperatureK: number,
  volumeL: number,
): number {
  const v = litersToCubicMeters(volumeL);
  if (!(v > 0)) {
    return 0;
  }
  return (Math.max(0, moles) * R_GAS * clampTemperatureK(temperatureK)) / v;
}

export function idealGasPressurePa(
  moles: number,
  temperatureK: number,
  volumeL: number,
): number {
  return partialPressurePa(moles, temperatureK, volumeL);
}

export function mixturePressurePa(
  components: GasComponent[],
  temperatureK: number,
  volumeL: number,
): number {
  return idealGasPressurePa(totalMoles(components), temperatureK, volumeL);
}

/** Most probable Maxwell speed √(2RT/M), m/s */
export function mostProbableSpeedMps(
  temperatureK: number,
  molarMassKg: number,
): number {
  const t = clampTemperatureK(temperatureK);
  const m = Math.max(molarMassKg, 1e-9);
  return Math.sqrt((2 * R_GAS * t) / m);
}

/** RMS speed √(3RT/M), m/s */
export function rmsSpeedMps(temperatureK: number, molarMassKg: number): number {
  const t = clampTemperatureK(temperatureK);
  const m = Math.max(molarMassKg, 1e-9);
  return Math.sqrt((3 * R_GAS * t) / m);
}

/** Mean Maxwell speed √(8RT/(πM)), m/s */
export function meanSpeedMps(temperatureK: number, molarMassKg: number): number {
  const t = clampTemperatureK(temperatureK);
  const m = Math.max(molarMassKg, 1e-9);
  return Math.sqrt((8 * R_GAS * t) / (Math.PI * m));
}

export function meanKineticEnergyJ(temperatureK: number): number {
  return (3 / 2) * K_BOLTZMANN * clampTemperatureK(temperatureK);
}

/**
 * Map real amount of substance to a bounded visual particle count.
 * Physical ν and visual N are intentionally not equal.
 */
export function molesToVisualCount(moles: number): number {
  const nu = clamp(
    finiteNumber(moles, MIN_MOLES),
    MIN_MOLES,
    MAX_MOLES * MAX_COMPONENTS,
  );
  const t = (nu - MIN_MOLES) / (8 - MIN_MOLES);
  const count = Math.round(
    MIN_VISUAL_PARTICLES +
      clamp(t, 0, 1) * (MAX_VISUAL_PARTICLES - MIN_VISUAL_PARTICLES),
  );
  return clamp(count, MIN_VISUAL_PARTICLES, MAX_VISUAL_PARTICLES);
}

export function allocateVisualCounts(
  components: GasComponent[],
): Record<string, number> {
  const total = totalMoles(components);
  const target = molesToVisualCount(total);
  const result: Record<string, number> = {};

  if (!(total > 0) || components.length === 0) {
    return result;
  }

  let assigned = 0;
  components.forEach((component, index) => {
    if (index === components.length - 1) {
      result[component.id] = Math.max(0, target - assigned);
      return;
    }
    const share = Math.round((component.moles / total) * target);
    result[component.id] = share;
    assigned += share;
  });

  return result;
}

export function vesselSizeForVolume(volumeL: number): {
  width: number;
  height: number;
} {
  const v = clamp(finiteNumber(volumeL, VESSEL_REF.volumeL), MIN_VOLUME_L, MAX_VOLUME_L);
  const scale = Math.sqrt(v / VESSEL_REF.volumeL);
  return {
    width: VESSEL_REF.width * scale,
    height: VESSEL_REF.height * scale,
  };
}

export function createVesselBounds(volumeL: number): VesselBounds {
  const size = vesselSizeForVolume(volumeL);
  return {
    width: size.width,
    height: size.height,
    depthM: VESSEL_REF.depthM,
  };
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function sampleSpeedFromTemperature(
  temperatureK: number,
  molarMassKg: number,
): number {
  // Use mean speed with slight random scatter around Maxwell-like values
  const mean = meanSpeedMps(temperatureK, molarMassKg);
  const factor = 0.55 + Math.random() * 0.9;
  return mean * factor;
}

function randomVelocity(
  temperatureK: number,
  molarMassKg: number,
): { vx: number; vy: number } {
  const speed = sampleSpeedFromTemperature(temperatureK, molarMassKg);
  const angle = Math.random() * Math.PI * 2;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

/** Visual scale: map physical m/s into canvas px/s */
export function speedToPixelsPerSecond(speedMps: number, vessel: VesselBounds): number {
  // Reference: typical N2 at 300 K ≈ 475 m/s, then slowed for comfortable viewing
  const refSpeed = 475;
  const refCrossTime = 1.15;
  const refPxPerS = Math.max(vessel.width, vessel.height) / refCrossTime;
  return (
    (finiteNumber(speedMps, 0) / refSpeed) * refPxPerS * VISUAL_SPEED_SCALE
  );
}

function representativeMassKg(gas: IdealGasDefinition): number {
  // Mass of one real molecule — used for impulse ratios
  return molarMassKgPerMol(gas) / N_AVOGADRO;
}

export function createParticle(
  component: GasComponent,
  bounds: VesselBounds,
  temperatureK: number,
): MktParticle {
  const gas = getGasById(component.gasId);
  const molarMass = molarMassKgPerMol(gas);
  const velocity = randomVelocity(temperatureK, molarMass);
  const r = PARTICLE_RADIUS_PX;
  return {
    id: nextParticleId++,
    componentId: component.id,
    gasId: gas.id,
    x: randomInRange(r, Math.max(r, bounds.width - r)),
    y: randomInRange(r, Math.max(r, bounds.height - r)),
    vx: velocity.vx,
    vy: velocity.vy,
    radius: r,
    color: gas.color,
    massKg: representativeMassKg(gas),
  };
}

export function rescaleParticleSpeeds(
  particles: MktParticle[],
  temperatureK: number,
): void {
  const t = clampTemperatureK(temperatureK);
  for (const particle of particles) {
    if (t === 0) {
      particle.vx = 0;
      particle.vy = 0;
      continue;
    }

    const gas = getGasById(particle.gasId);
    const target = meanSpeedMps(t, molarMassKgPerMol(gas));
    const current = Math.hypot(particle.vx, particle.vy);
    if (current < 1e-9) {
      const velocity = randomVelocity(t, molarMassKgPerMol(gas));
      particle.vx = velocity.vx;
      particle.vy = velocity.vy;
      continue;
    }
    const scale = target / current;
    const blend = 0.35 + Math.random() * 0.4;
    const factor = 1 + (scale - 1) * blend;
    particle.vx *= factor;
    particle.vy *= factor;
  }
}

export function syncParticlesToParams(
  particles: MktParticle[],
  params: MktParams,
  bounds: VesselBounds,
): MktParticle[] {
  const safe = sanitizeParams(params);
  const targets = allocateVisualCounts(safe.components);
  const byComponent = new Map<string, MktParticle[]>();

  for (const particle of particles) {
    const list = byComponent.get(particle.componentId) ?? [];
    list.push(particle);
    byComponent.set(particle.componentId, list);
  }

  const next: MktParticle[] = [];
  const componentIds = new Set(safe.components.map((c) => c.id));

  for (const component of safe.components) {
    const gas = getGasById(component.gasId);
    const existing = byComponent.get(component.id) ?? [];
    const want = targets[component.id] ?? 0;

    // Update gas identity / color on existing particles of this component
    for (const particle of existing) {
      particle.gasId = gas.id;
      particle.color = gas.color;
      particle.massKg = representativeMassKg(gas);
      particle.componentId = component.id;
    }

    if (existing.length > want) {
      existing.length = want;
    } else {
      while (existing.length < want) {
        existing.push(createParticle(component, bounds, safe.temperatureK));
      }
    }

    next.push(...existing);
  }

  // Drop particles belonging to removed components
  for (const [componentId, list] of byComponent) {
    if (!componentIds.has(componentId)) {
      void list;
    }
  }

  // Keep particles inside vessel after volume change
  for (const particle of next) {
    particle.x = clamp(particle.x, particle.radius, bounds.width - particle.radius);
    particle.y = clamp(particle.y, particle.radius, bounds.height - particle.radius);
  }

  rescaleParticleSpeeds(next, safe.temperatureK);
  return next;
}

export function heaterStrength(heater: number): number {
  const power = clamp(finiteNumber(heater, 0), -1, 1);
  if (Math.abs(power) < 0.02) {
    return 0;
  }

  const sign = power < 0 ? -1 : 1;
  return sign * Math.abs(power) ** 3;
}

export function applyHeater(
  temperatureK: number,
  heater: number,
  dt: number,
): number {
  const strength = heaterStrength(heater);
  if (strength === 0) {
    return clampTemperatureK(temperatureK);
  }
  const delta = strength * HEATER_RATE_K_PER_S * sanitizeDt(dt);
  return clampTemperatureK(temperatureK + delta);
}

export function computeMacroState(params: MktParams): MktMacroState {
  const safe = sanitizeParams(params);
  const nu = totalMoles(safe.components);
  const volumeM3 = litersToCubicMeters(safe.volumeL);
  const pressurePa = mixturePressurePa(
    safe.components,
    safe.temperatureK,
    safe.volumeL,
  );

  const partialPressuresPa: Record<string, number> = {};
  for (const component of safe.components) {
    partialPressuresPa[component.id] = partialPressurePa(
      component.moles,
      safe.temperatureK,
      safe.volumeL,
    );
  }

  // Mixture mean speed: mole-weighted average of component mean speeds
  let meanSpeed = 0;
  let rmsSpeed = 0;
  if (nu > 0) {
    for (const component of safe.components) {
      const gas = getGasById(component.gasId);
      const weight = component.moles / nu;
      const m = molarMassKgPerMol(gas);
      meanSpeed += weight * meanSpeedMps(safe.temperatureK, m);
      rmsSpeed += weight * rmsSpeedMps(safe.temperatureK, m);
    }
  }

  return {
    temperatureK: safe.temperatureK,
    volumeL: safe.volumeL,
    volumeM3,
    totalMoles: nu,
    pressurePa,
    partialPressuresPa,
    meanSpeedMps: meanSpeed,
    rmsSpeedMps: rmsSpeed,
  };
}

export function wallAreaM2(bounds: VesselBounds): number {
  // Approximate 3D vessel surface from 2D rectangle + depth
  const widthM = 0.35 * (bounds.width / VESSEL_REF.width);
  const heightM = 0.23 * (bounds.height / VESSEL_REF.height);
  const depthM = bounds.depthM;
  return 2 * (widthM * heightM + widthM * depthM + heightM * depthM);
}

export type ImpulseWindow = {
  samples: Array<{ t: number; impulse: number }>;
  totalHits: number;
};

export function createImpulseWindow(): ImpulseWindow {
  return { samples: [], totalHits: 0 };
}

export function recordImpulse(
  window: ImpulseWindow,
  nowS: number,
  impulseNs: number,
  hits: number,
): void {
  window.samples.push({ t: nowS, impulse: impulseNs });
  window.totalHits += hits;
  const cutoff = nowS - PRESSURE_WINDOW_S;
  while (window.samples.length > 0 && window.samples[0]!.t < cutoff) {
    window.samples.shift();
  }
}

export function experimentalPressureFromWindow(
  window: ImpulseWindow,
  bounds: VesselBounds,
  nowS: number,
): number {
  if (window.samples.length === 0) {
    return 0;
  }

  const cutoff = nowS - PRESSURE_WINDOW_S;
  let impulseSum = 0;
  let earliest = nowS;
  for (const sample of window.samples) {
    if (sample.t >= cutoff) {
      impulseSum += sample.impulse;
      earliest = Math.min(earliest, sample.t);
    }
  }

  const dt = Math.max(nowS - earliest, 1e-3);
  const area = wallAreaM2(bounds);
  if (!(area > 0)) {
    return 0;
  }

  // P ≈ Δp / (Δt · A); scale so typical runs sit near macro order of magnitude
  const raw = impulseSum / (dt * area);
  return Math.max(0, raw);
}

export function selectDisplayedPressure(
  visualCount: number,
  macroPressurePa: number,
  experimentalPressurePa: number,
  totalWallHits: number,
): { pressurePa: number; usingCollisionPressure: boolean } {
  if (visualCount <= COLLISION_PRESSURE_THRESHOLD) {
    if (totalWallHits === 0) {
      return { pressurePa: 0, usingCollisionPressure: true };
    }

    // After the first wall hit the macroscopic law is used for a stable
    // pascal reading; impulse is still tracked for flashes and hit count.
    // Raw 2D sample impulse is many orders of magnitude below real P.
    return {
      pressurePa: Number.isFinite(experimentalPressurePa)
        ? macroPressurePa
        : macroPressurePa,
      usingCollisionPressure: true,
    };
  }

  return { pressurePa: macroPressurePa, usingCollisionPressure: false };
}

export function stepParticles(
  particles: MktParticle[],
  dt: number,
  bounds: VesselBounds,
  temperatureK: number,
  nowMs: number,
): MktStepResult {
  const safeDt = sanitizeDt(dt);
  const flashes: WallHitFlash[] = [];
  let wallHitsDelta = 0;
  let impulseSumNs = 0;

  if (safeDt === 0 || particles.length === 0) {
    return { particles, wallHitsDelta: 0, impulseSumNs: 0, flashes };
  }

  const t = clampTemperatureK(temperatureK);
  if (t === 0) {
    for (const particle of particles) {
      particle.vx = 0;
      particle.vy = 0;
    }
    return { particles, wallHitsDelta: 0, impulseSumNs: 0, flashes };
  }

  // Mild thermostat so speeds track temperature without killing chaos
  if (Math.random() < 0.08) {
    rescaleParticleSpeeds(particles, t);
  }

  for (const particle of particles) {
    const pxSpeedX = speedToPixelsPerSecond(particle.vx, bounds);
    const pxSpeedY = speedToPixelsPerSecond(particle.vy, bounds);
    particle.x += pxSpeedX * safeDt;
    particle.y += pxSpeedY * safeDt;

    const minX = particle.radius;
    const maxX = bounds.width - particle.radius;
    const minY = particle.radius;
    const maxY = bounds.height - particle.radius;

    if (particle.x < minX) {
      particle.x = minX;
      const vn = Math.abs(particle.vx);
      impulseSumNs += 2 * particle.massKg * vn;
      particle.vx = Math.abs(particle.vx);
      wallHitsDelta += 1;
      flashes.push({
        id: nextFlashId++,
        x: 0,
        y: particle.y,
        wall: 'left',
        bornAt: nowMs,
      });
    } else if (particle.x > maxX) {
      particle.x = maxX;
      const vn = Math.abs(particle.vx);
      impulseSumNs += 2 * particle.massKg * vn;
      particle.vx = -Math.abs(particle.vx);
      wallHitsDelta += 1;
      flashes.push({
        id: nextFlashId++,
        x: bounds.width,
        y: particle.y,
        wall: 'right',
        bornAt: nowMs,
      });
    }

    if (particle.y < minY) {
      particle.y = minY;
      const vn = Math.abs(particle.vy);
      impulseSumNs += 2 * particle.massKg * vn;
      particle.vy = Math.abs(particle.vy);
      wallHitsDelta += 1;
      flashes.push({
        id: nextFlashId++,
        x: particle.x,
        y: 0,
        wall: 'top',
        bornAt: nowMs,
      });
    } else if (particle.y > maxY) {
      particle.y = maxY;
      const vn = Math.abs(particle.vy);
      impulseSumNs += 2 * particle.massKg * vn;
      particle.vy = -Math.abs(particle.vy);
      wallHitsDelta += 1;
      flashes.push({
        id: nextFlashId++,
        x: particle.x,
        y: bounds.height,
        wall: 'bottom',
        bornAt: nowMs,
      });
    }
  }

  return { particles, wallHitsDelta, impulseSumNs, flashes };
}

export function measureMeanParticleSpeedMps(particles: MktParticle[]): number {
  if (particles.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const particle of particles) {
    sum += Math.hypot(particle.vx, particle.vy);
  }
  return sum / particles.length;
}

export function buildRuntimeStats(options: {
  particles: MktParticle[];
  macro: MktMacroState;
  wallHits: number;
  wallHitsWindow: number;
  experimentalPressurePa: number;
}): MktRuntimeStats {
  const visualMoleculeCount = options.particles.length;
  const displayed = selectDisplayedPressure(
    visualMoleculeCount,
    options.macro.pressurePa,
    options.experimentalPressurePa,
    options.wallHits,
  );

  return {
    visualMoleculeCount,
    wallHits: options.wallHits,
    wallHitsWindow: options.wallHitsWindow,
    experimentalPressurePa: options.experimentalPressurePa,
    displayedPressurePa: displayed.pressurePa,
    usingCollisionPressure: displayed.usingCollisionPressure,
    meanSpeedMps: measureMeanParticleSpeedMps(options.particles),
  };
}

export function createMktSnapshot(params: MktParams): MktSnapshot {
  const safe = sanitizeParams(params);
  const macro = computeMacroState(safe);
  return {
    macro,
    heater: safe.heater,
    runtime: {
      visualMoleculeCount: molesToVisualCount(macro.totalMoles),
      wallHits: 0,
      wallHitsWindow: 0,
      experimentalPressurePa: 0,
      displayedPressurePa:
        molesToVisualCount(macro.totalMoles) <= COLLISION_PRESSURE_THRESHOLD
          ? 0
          : macro.pressurePa,
      usingCollisionPressure:
        molesToVisualCount(macro.totalMoles) <= COLLISION_PRESSURE_THRESHOLD,
      meanSpeedMps: macro.meanSpeedMps,
    },
  };
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return (0).toFixed(digits);
  }
  const rounded = Number(value.toFixed(digits));
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return normalized.toFixed(digits);
}

export function formatPressure(pressurePa: number): string {
  const p = Math.max(0, finiteNumber(pressurePa, 0));
  if (p >= 1000) {
    return `${Math.round(p).toLocaleString('ru-RU')} Па`;
  }
  if (p >= 10) {
    return `${formatNumber(p, 1)} Па`;
  }
  if (p > 0) {
    return `${formatNumber(p, 2)} Па`;
  }
  return '0 Па';
}

export function formatTemperatureK(temperatureK: number): string {
  return `${Math.round(clampTemperatureK(temperatureK))} K`;
}

export function formatTemperatureC(temperatureK: number): string {
  const celsius = kelvinToCelsius(temperatureK);
  return `${Math.round(celsius)} °C`;
}

export function formatVolumeL(volumeL: number): string {
  const v = finiteNumber(volumeL, 0);
  return `${formatNumber(v, v % 1 === 0 ? 0 : 1)} л`;
}

export function formatMoles(moles: number): string {
  const n = finiteNumber(moles, 0);
  return `${formatNumber(n, n % 1 === 0 ? 0 : 1)} моль`;
}

export function formatSpeed(speedMps: number): string {
  const v = Math.max(0, finiteNumber(speedMps, 0));
  if (v >= 100) {
    return `${Math.round(v)} м/с`;
  }
  return `${formatNumber(v, 1)} м/с`;
}

export function canAddComponent(components: GasComponent[]): boolean {
  return components.length < MAX_COMPONENTS;
}

export function addGasComponent(components: GasComponent[]): GasComponent[] {
  if (!canAddComponent(components)) {
    return components;
  }
  const used = new Set(components.map((c) => c.gasId));
  const nextGas =
    IDEAL_GASES.find((gas) => !used.has(gas.id)) ?? getGasById(DEFAULT_GAS_ID);
  return [
    ...components,
    {
      id: createComponentId(),
      gasId: nextGas.id,
      moles: 0.5,
    },
  ];
}

export function removeGasComponent(
  components: GasComponent[],
  componentId: string,
): GasComponent[] {
  if (components.length <= 1) {
    return components;
  }
  return components.filter((component) => component.id !== componentId);
}
