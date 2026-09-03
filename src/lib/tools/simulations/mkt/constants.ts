import { DEFAULT_GAS_ID } from './gases';
import type { MktParams } from './types';

/** Universal gas constant, J/(mol·K) */
export const R_GAS = 8.314462618;

/** Boltzmann constant, J/K */
export const K_BOLTZMANN = 1.380649e-23;

/** Avogadro number, 1/mol */
export const N_AVOGADRO = 6.02214076e23;

export const ZERO_CELSIUS_IN_KELVIN = 273.15;

/** Absolute zero guard — never allow T ≤ 0 K */
export const MIN_TEMPERATURE_K = 1;
export const MAX_TEMPERATURE_K = 1000;

export const MIN_VOLUME_L = 5;
export const MAX_VOLUME_L = 80;

export const MIN_MOLES = 0.1;
export const MAX_MOLES = 5;
export const MAX_COMPONENTS = 4;

/** Visual particle count bounds (not equal to real ν) */
export const MIN_VISUAL_PARTICLES = 20;
export const MAX_VISUAL_PARTICLES = 300;

/**
 * Below this visual count, pressure may be derived from wall collisions
 * so that zero hits can show P = 0.
 */
export const COLLISION_PRESSURE_THRESHOLD = 48;

export const MAX_STEP_DT = 1 / 30;
export const MAX_FRAME_DT = 1 / 30;

/** UI snapshot throttle */
export const SNAPSHOT_MS = 80;

/** How long wall-hit flashes remain visible (ms) */
export const WALL_FLASH_MS = 180;

/** Sliding window for experimental pressure (s) */
export const PRESSURE_WINDOW_S = 0.45;

/** Heater rate: kelvin per second at full slider power (after nonlinear shaping) */
export const HEATER_RATE_K_PER_S = 160;

/**
 * Scales physical molecular speed into canvas motion only.
 * Does not change vср = √(8RT / πM) or other physics.
 */
export const VISUAL_SPEED_SCALE = 0.32;

export const PARTICLE_RADIUS_PX = 4.2;

export const MKT_RANGES = {
  temperatureK: { min: MIN_TEMPERATURE_K, max: MAX_TEMPERATURE_K, step: 1 },
  temperatureC: {
    min: MIN_TEMPERATURE_K - ZERO_CELSIUS_IN_KELVIN,
    max: MAX_TEMPERATURE_K - ZERO_CELSIUS_IN_KELVIN,
    step: 1,
  },
  volumeL: { min: MIN_VOLUME_L, max: MAX_VOLUME_L, step: 0.5 },
  moles: { min: MIN_MOLES, max: MAX_MOLES, step: 0.1 },
  heater: { min: -1, max: 1, step: 0.01 },
} as const;

export const MKT_DEFAULT_PARAMS: MktParams = {
  temperatureK: 300,
  volumeL: 22.4,
  temperatureUnit: 'K',
  heater: 0,
  components: [
    {
      id: 'component-1',
      gasId: DEFAULT_GAS_ID,
      moles: 1,
    },
  ],
};

/** Base vessel size in SVG/canvas units at reference volume */
export const VESSEL_REF = {
  volumeL: 22.4,
  width: 520,
  height: 340,
  paddingX: 48,
  paddingTop: 88,
  paddingBottom: 132,
  viewW: 720,
  viewH: 640,
  cornerRadius: 18,
  depthM: 0.12,
} as const;
