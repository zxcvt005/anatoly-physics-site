import type { KinematicsParams } from './types';

export const MAX_FRAME_DT = 1 / 30;
export const GRAPH_SAMPLE_COUNT = 240;
export const PLAYBACK_SPEED = 1;

/** Fraction of plot height above the t-axis (zero line). */
export const GRAPH_ZERO_ABOVE_FRACTION = 0.6;

export const KINEMATICS_DEFAULT_PARAMS: KinematicsParams = {
  x0: 0,
  v0: 10,
  a: 2,
  duration: 10,
};

export const KINEMATICS_RANGES = {
  x0: { min: -20, max: 20, step: 0.5 },
  v0: { min: -15, max: 15, step: 0.5 },
  a: { min: -10, max: 10, step: 0.1 },
  duration: { min: 0, max: 60, step: 0.5 },
} as const;

export const SCALE_PADDING = 0.12;
export const DEFAULT_TARGET_TICKS = 6;

/** Visual scales for instantaneous vectors on the coordinate axis. */
export const VELOCITY_PIXELS_PER_UNIT = 1.45;
export const ACCELERATION_PIXELS_PER_UNIT = 1.9;
export const VELOCITY_ARROW_MIN = 16;
export const VELOCITY_ARROW_MAX = 38;
export const ACCELERATION_ARROW_MIN = 14;
export const ACCELERATION_ARROW_MAX = 32;
export const VECTOR_ZERO_EPS = 0.05;

/** Trail bulge under the axis: first segment smaller, reverse segment larger. */
export const TRAIL_AMP_BASE_MIN = 18;
export const TRAIL_AMP_BASE_MAX = 28;
export const TRAIL_AMP_REVERSE_MIN = 34;
export const TRAIL_AMP_REVERSE_MAX = 52;
