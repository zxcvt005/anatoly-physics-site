import {
  ACCELERATION_ARROW_MAX,
  ACCELERATION_ARROW_MIN,
  ACCELERATION_PIXELS_PER_UNIT,
  GRAPH_SAMPLE_COUNT,
  KINEMATICS_DEFAULT_PARAMS,
  KINEMATICS_RANGES,
  TRAIL_AMP_BASE_MAX,
  TRAIL_AMP_BASE_MIN,
  TRAIL_AMP_REVERSE_MAX,
  TRAIL_AMP_REVERSE_MIN,
  VECTOR_ZERO_EPS,
  VELOCITY_ARROW_MAX,
  VELOCITY_ARROW_MIN,
  VELOCITY_PIXELS_PER_UNIT,
} from './constants';
import { niceScaleIncludingZero, niceTimeScale } from './scales';
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

/**
 * Static axes for the research interval: shared t∈[0, T], value axes always include 0.
 */
export function buildScales(params: KinematicsParams): KinematicsScales {
  const T = Math.max(0, params.duration);
  const xExt = computeXExtents(params);
  const vExt = computeVExtents(params);

  return {
    time: niceTimeScale(T),
    x: niceScaleIncludingZero(xExt.min, xExt.max),
    v: niceScaleIncludingZero(vExt.min, vExt.max),
  };
}

/**
 * Direction reverse inside (0, tEnd): a ≠ 0, v₀·a < 0, and
 * t_turn = −v₀/a lies strictly inside the interval.
 * v₀ = 0 is not a turn (initial rest), since v₀·a = 0.
 */
export function findVelocityTurnTimes(
  params: KinematicsParams,
  tEnd: number,
): number[] {
  if (params.a === 0 || params.v0 * params.a >= 0 || tEnd <= 0) {
    return [];
  }
  const tTurn = -params.v0 / params.a;
  if (tTurn > 1e-9 && tTurn < tEnd - 1e-9) {
    return [tTurn];
  }
  return [];
}

export type VelocityTurnPoint = {
  t: number;
  x: number;
};

/** Fixed turn marker for the full research interval [0, T], or null. */
export function getVelocityTurnPoint(
  params: KinematicsParams,
): VelocityTurnPoint | null {
  const turns = findVelocityTurnTimes(params, Math.max(0, params.duration));
  if (turns.length === 0) {
    return null;
  }
  const t = turns[0]!;
  return { t, x: positionAt(params, t) };
}

export type TrailArrow = {
  x: number;
  y: number;
  angleDeg: number;
};

export type TrailVisual = {
  /** One path per monotonic segment so reverse arcs stay distinct. */
  segments: string[];
  /** Arrow at the start of the whole trail. */
  startArrow: TrailArrow | null;
  /** Arrow at the current tip of the trail. */
  endArrow: TrailArrow | null;
};

function trailAmplitude(spanPx: number, segmentIndex: number): number {
  if (segmentIndex === 0) {
    return clamp(spanPx * 0.2, TRAIL_AMP_BASE_MIN, TRAIL_AMP_BASE_MAX);
  }
  return clamp(spanPx * 0.32, TRAIL_AMP_REVERSE_MIN, TRAIL_AMP_REVERSE_MAX);
}

function angleDeg(dx: number, dy: number): number {
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Smooth SVG trail under the coordinate axis.
 * Endpoints sit ON the axis; reverse segments use a larger bulge so arcs stay distinct.
 */
export function buildTrailVisual(
  params: KinematicsParams,
  t: number,
  toAxisX: (x: number) => number,
  axisY: number,
): TrailVisual {
  if (!(t > 1e-6)) {
    return { segments: [], startArrow: null, endArrow: null };
  }

  const turns = findVelocityTurnTimes(params, t);
  const knots = [0, ...turns, t];
  const segments: string[] = [];
  let startArrow: TrailArrow | null = null;
  let endArrow: TrailArrow | null = null;

  for (let i = 0; i < knots.length - 1; i += 1) {
    const t0 = knots[i]!;
    const t1 = knots[i + 1]!;
    const x0 = toAxisX(positionAt(params, t0));
    const x1 = toAxisX(positionAt(params, t1));
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
      continue;
    }
    if (Math.abs(x1 - x0) < 0.5) {
      continue;
    }

    const mid = (x0 + x1) / 2;
    const amp = trailAmplitude(Math.abs(x1 - x0), i);
    const controlY = axisY + amp;
    segments.push(
      `M ${x0.toFixed(2)} ${axisY.toFixed(2)} Q ${mid.toFixed(2)} ${controlY.toFixed(2)} ${x1.toFixed(2)} ${axisY.toFixed(2)}`,
    );

    const startAngle = angleDeg(mid - x0, controlY - axisY);
    const endAngle = angleDeg(x1 - mid, axisY - controlY);

    if (!startArrow) {
      startArrow = { x: x0, y: axisY, angleDeg: startAngle };
    }
    endArrow = { x: x1, y: axisY, angleDeg: endAngle };
  }

  return { segments, startArrow, endArrow };
}

/** Compatibility helper used by existing tests. */
export function buildSmoothTrailPath(
  params: KinematicsParams,
  t: number,
  toAxisX: (x: number) => number,
  trailY: number,
): string {
  return buildTrailVisual(params, t, toAxisX, trailY).segments.join(' ');
}

export function velocityArrowLength(v: number): number {
  if (!Number.isFinite(v) || Math.abs(v) < VECTOR_ZERO_EPS) {
    return 0;
  }
  return clamp(
    Math.abs(v) * VELOCITY_PIXELS_PER_UNIT,
    VELOCITY_ARROW_MIN,
    VELOCITY_ARROW_MAX,
  );
}

export function accelerationArrowLength(a: number): number {
  if (!Number.isFinite(a) || Math.abs(a) < VECTOR_ZERO_EPS) {
    return 0;
  }
  return clamp(
    Math.abs(a) * ACCELERATION_PIXELS_PER_UNIT,
    ACCELERATION_ARROW_MIN,
    ACCELERATION_ARROW_MAX,
  );
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

export function formatVectorLabel(
  symbol: string,
  value: number,
  unit: string,
): string {
  return `${symbol} = ${formatNumber(value)} ${unit}`;
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
