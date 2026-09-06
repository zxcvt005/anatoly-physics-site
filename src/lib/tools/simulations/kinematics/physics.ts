import { GRAPH_SAMPLE_COUNT, KINEMATICS_DEFAULT_PARAMS, KINEMATICS_RANGES } from './constants';
import { niceScale } from './scales';
import type {
  KinematicsLiveState,
  KinematicsParams,
  KinematicsSample,
  NiceScale,
} from './types';

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sanitizeParams(input: Partial<KinematicsParams>): KinematicsParams {
  const x0 = clamp(
    finiteOr(input.x0 ?? KINEMATICS_DEFAULT_PARAMS.x0, KINEMATICS_DEFAULT_PARAMS.x0),
    KINEMATICS_RANGES.x0.min,
    KINEMATICS_RANGES.x0.max,
  );
  const v0 = clamp(
    finiteOr(input.v0 ?? KINEMATICS_DEFAULT_PARAMS.v0, KINEMATICS_DEFAULT_PARAMS.v0),
    KINEMATICS_RANGES.v0.min,
    KINEMATICS_RANGES.v0.max,
  );
  const a = clamp(
    finiteOr(input.a ?? KINEMATICS_DEFAULT_PARAMS.a, KINEMATICS_DEFAULT_PARAMS.a),
    KINEMATICS_RANGES.a.min,
    KINEMATICS_RANGES.a.max,
  );
  const duration = clamp(
    finiteOr(
      input.duration ?? KINEMATICS_DEFAULT_PARAMS.duration,
      KINEMATICS_DEFAULT_PARAMS.duration,
    ),
    KINEMATICS_RANGES.duration.min,
    KINEMATICS_RANGES.duration.max,
  );

  return { x0, v0, a, duration };
}

/** x(t) = x₀ + v₀t + at²/2 */
export function positionAt(params: KinematicsParams, t: number): number {
  const time = Math.max(0, finiteOr(t, 0));
  return params.x0 + params.v0 * time + 0.5 * params.a * time * time;
}

/** v(t) = v₀ + at */
export function velocityAt(params: KinematicsParams, t: number): number {
  const time = Math.max(0, finiteOr(t, 0));
  return params.v0 + params.a * time;
}

export function liveStateAt(params: KinematicsParams, t: number): KinematicsLiveState {
  const time = clamp(finiteOr(t, 0), 0, Math.max(0, params.duration));
  return {
    time,
    x: positionAt(params, time),
    v: velocityAt(params, time),
  };
}

export function sampleGraphs(
  params: KinematicsParams,
  sampleCount = GRAPH_SAMPLE_COUNT,
): KinematicsSample[] {
  const T = Math.max(0, params.duration);
  const count = Math.max(2, Math.floor(sampleCount));
  const samples: KinematicsSample[] = [];

  if (T === 0) {
    samples.push({
      t: 0,
      x: positionAt(params, 0),
      v: velocityAt(params, 0),
    });
    return samples;
  }

  for (let i = 0; i < count; i += 1) {
    const t = (T * i) / (count - 1);
    samples.push({
      t,
      x: positionAt(params, t),
      v: velocityAt(params, t),
    });
  }

  return samples;
}

/** Extreme x over [0, T], including vertex if it lies inside the interval. */
export function computeXExtents(params: KinematicsParams): { min: number; max: number } {
  const T = Math.max(0, params.duration);
  const values = [positionAt(params, 0), positionAt(params, T)];

  if (params.a !== 0) {
    const tVertex = -params.v0 / params.a;
    if (tVertex > 0 && tVertex < T) {
      values.push(positionAt(params, tVertex));
    }
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function computeVExtents(params: KinematicsParams): { min: number; max: number } {
  const T = Math.max(0, params.duration);
  const vStart = velocityAt(params, 0);
  const vEnd = velocityAt(params, T);
  return {
    min: Math.min(vStart, vEnd),
    max: Math.max(vStart, vEnd),
  };
}

export type KinematicsScales = {
  time: NiceScale;
  x: NiceScale;
  v: NiceScale;
};

export function buildScales(params: KinematicsParams): KinematicsScales {
  const T = Math.max(0, params.duration);
  const xExt = computeXExtents(params);
  const vExt = computeVExtents(params);

  return {
    time: niceScale(0, T === 0 ? 1 : T, 5, 0.02),
    x: niceScale(xExt.min, xExt.max),
    v: niceScale(vExt.min, vExt.max),
  };
}

export function formatMeters(value: number): string {
  return `${formatNumber(value)} м`;
}

export function formatMetersPerSecond(value: number): string {
  return `${formatNumber(value)} м/с`;
}

export function formatAcceleration(value: number): string {
  return `${formatNumber(value)} м/с²`;
}

export function formatSeconds(value: number): string {
  return `${formatNumber(value)} с`;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return value.toFixed(0);
  }
  if (abs >= 100) {
    return Number(value.toFixed(1)).toString();
  }
  if (abs >= 10) {
    return Number(value.toFixed(2)).toString();
  }
  return Number(value.toFixed(2)).toString();
}

export function formatTick(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const abs = Math.abs(value);
  if (abs >= 100 || Number.isInteger(value)) {
    return value.toFixed(0);
  }
  if (abs >= 10) {
    return Number(value.toFixed(1)).toString();
  }
  return Number(value.toFixed(2)).toString();
}
