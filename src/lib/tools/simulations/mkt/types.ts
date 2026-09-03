export type TemperatureUnit = 'K' | 'C';

export type GasComponent = {
  id: string;
  gasId: string;
  /** Amount of substance in moles */
  moles: number;
};

export type MktParams = {
  /** Absolute temperature in kelvin (source of truth) */
  temperatureK: number;
  /** Vessel volume in liters */
  volumeL: number;
  components: GasComponent[];
  temperatureUnit: TemperatureUnit;
  /**
   * Heater control in [-1, 1].
   * Negative = cooling, 0 = neutral, positive = heating.
   */
  heater: number;
};

export type MktParticle = {
  id: number;
  componentId: string;
  gasId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  /** Molecular mass used for impulse (kg), representative */
  massKg: number;
};

export type WallHitFlash = {
  id: number;
  x: number;
  y: number;
  wall: 'left' | 'right' | 'top' | 'bottom';
  bornAt: number;
};

export type VesselBounds = {
  width: number;
  height: number;
  /** Physical depth used for area in pressure from collisions (m) */
  depthM: number;
};

export type MktMacroState = {
  temperatureK: number;
  volumeL: number;
  volumeM3: number;
  totalMoles: number;
  pressurePa: number;
  partialPressuresPa: Record<string, number>;
  meanSpeedMps: number;
  rmsSpeedMps: number;
};

export type MktRuntimeStats = {
  visualMoleculeCount: number;
  wallHits: number;
  wallHitsWindow: number;
  experimentalPressurePa: number;
  displayedPressurePa: number;
  usingCollisionPressure: boolean;
  meanSpeedMps: number;
};

export type MktSnapshot = {
  macro: MktMacroState;
  runtime: MktRuntimeStats;
  heater: number;
};

export type MktStepResult = {
  particles: MktParticle[];
  wallHitsDelta: number;
  impulseSumNs: number;
  flashes: WallHitFlash[];
};
