import type { KinematicsParams } from './types';

export const MAX_FRAME_DT = 1 / 30;
export const GRAPH_SAMPLE_COUNT = 120;
export const PLAYBACK_SPEED = 1;

export const KINEMATICS_DEFAULT_PARAMS: KinematicsParams = {
  x0: 0,
  v0: 10,
  a: 2,
  duration: 10,
};

export const KINEMATICS_RANGES = {
  x0: { min: -2000, max: 2000, step: 1 },
  v0: { min: -200, max: 200, step: 0.5 },
  a: { min: -50, max: 50, step: 0.1 },
  duration: { min: 0, max: 120, step: 0.5 },
} as const;

export const SCALE_PADDING = 0.12;
export const DEFAULT_TARGET_TICKS = 6;
