import type { HumidityControlMode, HumidityParams } from './types';

/** Molar mass of water, kg/mol (IUPAC). */
export const WATER_MOLAR_MASS = 0.01801528;

/** Avogadro constant, 1/mol. */
export const N_AVOGADRO = 6.02214076e23;

/** Universal gas constant, J/(mol·K). */
export const R_GAS = 8.314462618;

export const ZERO_CELSIUS_IN_KELVIN = 273.15;

export const MIN_TEMPERATURE_C = 0;
export const MAX_TEMPERATURE_C = 100;

export const MIN_VOLUME_M3 = 0.2;
export const MAX_VOLUME_M3 = 2;
export const DEFAULT_VOLUME_M3 = 1;

/** Liquid water density for visual layer height only, kg/m³. */
export const LIQUID_WATER_DENSITY = 997;

export const MIN_VISUAL_PARTICLES = 16;
export const MAX_VISUAL_PARTICLES = 140;

export const MAX_FRAME_DT = 1 / 30;
export const SNAPSHOT_MS = 80;

/** Vessel SVG layout (viewBox units). */
export const VESSEL = {
  width: 280,
  height: 420,
  padX: 36,
  padTop: 28,
  padBottom: 36,
  wall: 8,
  pistonHeight: 14,
} as const;

export const HUMIDITY_RANGES = {
  temperatureC: { min: MIN_TEMPERATURE_C, max: MAX_TEMPERATURE_C, step: 0.5 },
  volumeM3: { min: MIN_VOLUME_M3, max: MAX_VOLUME_M3, step: 0.01 },
  pressureKPa: { min: 0.1, max: 150, step: 0.05 },
  densityKgM3: { min: 0.001, max: 1.2, step: 0.001 },
  concentrationPerM3: { min: 1e22, max: 4e25, step: 1e22 },
  massKg: { min: 0.001, max: 2, step: 0.001 },
} as const;

export const CONTROL_MODE_OPTIONS: Array<{
  value: HumidityControlMode;
  label: string;
}> = [
  { value: 'pressure', label: 'Давление' },
  { value: 'density', label: 'Плотность' },
  { value: 'concentration', label: 'Концентрация' },
  { value: 'mass', label: 'Масса' },
];

/**
 * Default: T = 20 °C, V = 1 м³, unsaturated vapor near a typical
 * classroom demo (≈ half of ρнас).
 */
export const HUMIDITY_DEFAULT_PARAMS: HumidityParams = {
  temperatureC: 20,
  volumeM3: DEFAULT_VOLUME_M3,
  controlMode: 'density',
  pressureKPa: 1.17,
  densityKgM3: 0.0085,
  concentrationPerM3: 2.84e23,
  massKg: 0.0085,
};
