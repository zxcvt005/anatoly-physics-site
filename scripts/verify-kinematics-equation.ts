import assert from 'node:assert/strict';
import {
  KINEMATICS_DEFAULT_PARAMS,
  KINEMATICS_RANGES,
} from '../src/lib/tools/simulations/kinematics/constants';
import {
  buildScales,
  buildSmoothTrailPath,
  buildTrailVisual,
  computeVExtents,
  computeXExtents,
  findVelocityTurnTimes,
  formatVectorLabel,
  getVelocityTurnPoint,
  liveStateAt,
  positionAt,
  sampleGraphs,
  sanitizeParams,
  velocityArrowLength,
  accelerationArrowLength,
  velocityAt,
} from '../src/lib/tools/simulations/kinematics/physics';
import {
  niceScale,
  niceScaleIncludingZero,
  niceTimeScale,
} from '../src/lib/tools/simulations/kinematics/scales';
import type { KinematicsParams } from '../src/lib/tools/simulations/kinematics/types';

const errors: string[] = [];
let passed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    errors.push(
      `${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function approxEqual(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${expected}, got ${actual}`,
  );
}

function params(partial: Partial<KinematicsParams> = {}): KinematicsParams {
  return sanitizeParams({ ...KINEMATICS_DEFAULT_PARAMS, ...partial });
}

test('example: x0=0, v0=10, a=2, T=10', () => {
  const current = params({ x0: 0, v0: 10, a: 2, duration: 10 });
  approxEqual(positionAt(current, 0), 0);
  approxEqual(velocityAt(current, 0), 10);
  approxEqual(positionAt(current, 10), 200);
  approxEqual(velocityAt(current, 10), 30);
});

test('example: x0=0, v0=15, a=-10, T=5 reverses', () => {
  const current = params({ x0: 0, v0: 15, a: -10, duration: 5 });
  approxEqual(velocityAt(current, 1.5), 0);
  assert.ok(velocityAt(current, 5) < 0);
  const turns = findVelocityTurnTimes(current, 5);
  assert.equal(turns.length, 1);
  approxEqual(turns[0]!, 1.5);
});

test('example: x0=20, v0=-15, a=0, T=10', () => {
  const current = params({ x0: 20, v0: -15, a: 0, duration: 10 });
  approxEqual(positionAt(current, 10), -130);
  approxEqual(velocityAt(current, 0), -15);
  approxEqual(velocityAt(current, 10), -15);
});

test('example: x0=0, v0=0, a=0, T=10 stays still', () => {
  const current = params({ x0: 0, v0: 0, a: 0, duration: 10 });
  approxEqual(positionAt(current, 10), 0);
  approxEqual(velocityAt(current, 10), 0);
});

test('negative x0 works', () => {
  const current = params({ x0: -12, v0: 3, a: 1, duration: 4 });
  approxEqual(positionAt(current, 0), -12);
  assert.ok(positionAt(current, 4) > -12);
});

test('negative v0 and a', () => {
  const current = params({ x0: 5, v0: -8, a: -2, duration: 3 });
  assert.ok(velocityAt(current, 1) < 0);
  assert.ok(positionAt(current, 3) < 5);
});

test('input ranges are clamped', () => {
  const current = sanitizeParams({
    x0: 1000,
    v0: -50,
    a: 40,
    duration: 20,
  });
  assert.equal(current.x0, KINEMATICS_RANGES.x0.max);
  assert.equal(current.v0, KINEMATICS_RANGES.v0.min);
  assert.equal(current.a, KINEMATICS_RANGES.a.max);
  assert.equal(current.duration, KINEMATICS_RANGES.duration.max);
  assert.ok(current.x0 >= KINEMATICS_RANGES.x0.min);
  assert.ok(current.x0 <= KINEMATICS_RANGES.x0.max);
  assert.ok(current.v0 >= KINEMATICS_RANGES.v0.min);
  assert.ok(current.v0 <= KINEMATICS_RANGES.v0.max);
  assert.ok(current.a >= KINEMATICS_RANGES.a.min);
  assert.ok(current.a <= KINEMATICS_RANGES.a.max);
  assert.ok(current.duration >= KINEMATICS_RANGES.duration.min);
  assert.ok(current.duration <= KINEMATICS_RANGES.duration.max);
});

test('x(0)=x0 and v(0)=v0', () => {
  const current = params({ x0: -4, v0: 7, a: -1, duration: 5 });
  approxEqual(positionAt(current, 0), -4);
  approxEqual(velocityAt(current, 0), 7);
});

test('static scales always include zero', () => {
  const current = params({ x0: 0, v0: 10, a: 2, duration: 10 });
  const scales = buildScales(current);
  assert.ok(scales.x.min <= 0 && scales.x.max >= 0);
  assert.ok(scales.v.min <= 0 && scales.v.max >= 0);
  assert.equal(scales.time.min, 0);
  assert.ok(scales.time.max >= 10);
  assert.ok(scales.time.ticks.every((tick) => tick >= 0));
});

test('shared time scale for both graphs', () => {
  const current = params({ x0: 0, v0: 10, a: 2, duration: 10 });
  const scales = buildScales(current);
  const again = niceTimeScale(10);
  assert.equal(scales.time.min, again.min);
  assert.equal(scales.time.max, again.max);
  assert.equal(scales.time.step, again.step);
});

test('niceScaleIncludingZero keeps origin', () => {
  const scale = niceScaleIncludingZero(10, 200);
  assert.ok(scale.min <= 0);
  assert.ok(scale.max >= 200);
  assert.ok(scale.ticks.some((tick) => Math.abs(tick) < 1e-9));
});

test('niceScale still works for generic axes', () => {
  const scale = niceScale(0, 200, 6);
  assert.ok(scale.step > 0);
  assert.ok(scale.ticks.length >= 2);
});

test('buildScales covers x and v extents with zero', () => {
  const current = params({ x0: 0, v0: 15, a: -2, duration: 10 });
  const scales = buildScales(current);
  const xExt = computeXExtents(current);
  const vExt = computeVExtents(current);
  assert.ok(scales.x.min <= Math.min(0, xExt.min));
  assert.ok(scales.x.max >= Math.max(0, xExt.max));
  assert.ok(scales.v.min <= Math.min(0, vExt.min));
  assert.ok(scales.v.max >= Math.max(0, vExt.max));
});

test('smooth trail path is a single SVG path for forward motion', () => {
  const current = params({ x0: 0, v0: 10, a: 2, duration: 10 });
  const d = buildSmoothTrailPath(current, 5, (x) => x * 10, 80);
  assert.ok(d.startsWith('M '));
  assert.ok(d.includes(' Q '));
  assert.equal((d.match(/ Q /g) ?? []).length, 1);
});

test('smooth trail path splits on reverse', () => {
  const current = params({ x0: 0, v0: 15, a: -10, duration: 5 });
  const d = buildSmoothTrailPath(current, 5, (x) => x * 10, 80);
  assert.ok(d.includes(' Q '));
  assert.ok((d.match(/ Q /g) ?? []).length >= 2);
});

test('trail endpoints sit on the axis y', () => {
  const current = params({ x0: 0, v0: 10, a: 2, duration: 10 });
  const axisY = 58;
  const visual = buildTrailVisual(current, 4, (x) => 100 + x * 8, axisY);
  assert.equal(visual.segments.length, 1);
  assert.ok(visual.segments[0]!.includes(` ${axisY.toFixed(2)} Q `));
  assert.ok(visual.segments[0]!.endsWith(` ${axisY.toFixed(2)}`));
  assert.ok(visual.startArrow);
  assert.ok(visual.endArrow);
  assert.equal(visual.startArrow!.y, axisY);
  assert.equal(visual.endArrow!.y, axisY);
});

test('reverse trail uses a larger second arc', () => {
  const current = params({ x0: 0, v0: 15, a: -10, duration: 5 });
  const visual = buildTrailVisual(current, 5, (x) => x * 10, 50);
  assert.ok(visual.segments.length >= 2);
  const amp = (segment: string) => {
    const match = segment.match(/Q [-\d.]+ ([\d.]+)/);
    assert.ok(match);
    return Number(match![1]) - 50;
  };
  assert.ok(amp(visual.segments[1]!) > amp(visual.segments[0]!));
});

test('velocity and acceleration arrow lengths clamp and hide at zero', () => {
  assert.equal(velocityArrowLength(0), 0);
  assert.equal(accelerationArrowLength(0), 0);
  assert.ok(velocityArrowLength(15) > 0);
  assert.ok(accelerationArrowLength(-10) > 0);
  assert.ok(velocityArrowLength(15) <= 38);
  assert.ok(accelerationArrowLength(10) <= 32);
});

test('zero-anchored scale keeps uniform ratio for smooth graphs', () => {
  const scale = niceScaleIncludingZero(-20.25, 5);
  assert.ok(scale.min < 0 && scale.max > 0);
  const above = scale.max;
  const below = -scale.min;
  // Positive side ≈ 1.5× negative side (3/5 : 2/5).
  assert.ok(Math.abs(above / below - 1.5) < 0.35);
});

test('formatVectorLabel includes symbol value and unit', () => {
  assert.equal(formatVectorLabel('v', -9, 'м/с'), 'v = -9 м/с');
  assert.equal(formatVectorLabel('a', 2, 'м/с²'), 'a = 2 м/с²');
});

test('no NaN/Infinity from sanitize and samples', () => {
  const current = sanitizeParams({
    x0: Number.NaN,
    v0: Number.POSITIVE_INFINITY,
    a: Number.NEGATIVE_INFINITY,
    duration: Number.NaN,
  });
  assert.ok(Number.isFinite(current.x0));
  assert.ok(Number.isFinite(current.v0));
  assert.ok(Number.isFinite(current.a));
  assert.ok(Number.isFinite(current.duration));

  for (const sample of sampleGraphs(current)) {
    assert.ok(Number.isFinite(sample.t));
    assert.ok(Number.isFinite(sample.x));
    assert.ok(Number.isFinite(sample.v));
  }
});

test('T below min clamps to 1', () => {
  assert.equal(sanitizeParams({ duration: 0 }).duration, 1);
  assert.equal(sanitizeParams({ duration: 0.5 }).duration, 1);
  const current = params({ x0: 5, v0: 3, a: 1, duration: 1 });
  const live = liveStateAt(current, 0);
  approxEqual(live.time, 0);
  approxEqual(live.x, 5);
  approxEqual(live.v, 3);
});

test('x extents include parabola vertex inside interval', () => {
  const current = params({ x0: 0, v0: 15, a: -2, duration: 10 });
  const ext = computeXExtents(current);
  approxEqual(ext.max, positionAt(current, 7.5));
  approxEqual(ext.min, 0);
});

test('A: turn point exists for x0=0, v0=10, a=-2, T=10', () => {
  const current = params({ x0: 0, v0: 10, a: -2, duration: 10 });
  const turn = getVelocityTurnPoint(current);
  assert.ok(turn);
  approxEqual(turn!.t, 5);
  approxEqual(turn!.x, 25);
});

test('B: no turn when v0 and a have same sign', () => {
  const current = params({ x0: 0, v0: 10, a: 2, duration: 10 });
  assert.equal(getVelocityTurnPoint(current), null);
});

test('C: v0=0 is not a turn point', () => {
  const current = params({ x0: 0, v0: 0, a: 2, duration: 10 });
  assert.equal(getVelocityTurnPoint(current), null);
});

test('D: turn exists for x0=10, v0=-10, a=2, T=10', () => {
  const current = params({ x0: 10, v0: -10, a: 2, duration: 10 });
  const turn = getVelocityTurnPoint(current);
  assert.ok(turn);
  approxEqual(turn!.t, 5);
  approxEqual(turn!.x, -15);
});

test('E: duration range is [1, 10]', () => {
  assert.equal(KINEMATICS_RANGES.duration.min, 1);
  assert.equal(KINEMATICS_RANGES.duration.max, 10);
  assert.equal(sanitizeParams({ duration: 10 }).duration, 10);
  assert.equal(sanitizeParams({ duration: 10.1 }).duration, 10);
  assert.equal(sanitizeParams({ duration: 20 }).duration, 10);
});

if (errors.length > 0) {
  console.error('verify-kinematics-equation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-kinematics-equation: ${passed} tests passed`);
