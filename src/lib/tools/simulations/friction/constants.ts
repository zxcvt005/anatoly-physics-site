import type { FrictionBounds, FrictionParams } from './types';

export const DEFAULT_GRAVITY = 10;

export const REST_VELOCITY_THRESHOLD = 1e-4;
export const FORCE_BALANCE_EPSILON = 1e-9;
export const MAX_STEP_DT = 1 / 30;
export const MAX_FRAME_DT = 1 / 30;
export const MAX_SPEED = 120;

export const FRICTION_DEFAULT_PARAMS: FrictionParams = {
  mode: 'horizontal',
  mass: 5,
  mu: 0.3,
  angleDeg: 20,
  appliedForce: 0,
  gravity: DEFAULT_GRAVITY,
};

export const FRICTION_RANGES = {
  mass: { min: 1, max: 20, step: 0.5 },
  mu: { min: 0, max: 1, step: 0.01 },
  angleDeg: { min: 0, max: 45, step: 1 },
  appliedForce: { min: 0, max: 80, step: 0.5 },
  gravity: { min: 1, max: 20, step: 0.1 },
} as const;

export const MASS_VISUAL_SCALE = {
  min: 0.85,
  max: 1.15,
} as const;

export const SURFACE_LENGTH_M = 8;
export const BLOCK_LENGTH_M = 0.85;

export const FRICTION_BOUNDS: FrictionBounds = {
  minPosition: -200,
  maxPosition: 200,
};

export const INITIAL_MOTION = {
  position: 0,
  velocity: 0,
} as const;
