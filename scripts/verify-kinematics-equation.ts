import assert from 'node:assert/strict';
import { KINEMATICS_DEFAULT_PARAMS } from '../src/lib/tools/simulations/kinematics/constants';
import {
  buildScales,
  computeVExtents,
  computeXExtents,
  liveStateAt,
  positionAt,
  sampleGraphs,
  sanitizeParams,
  velocityAt,
} from '../src/lib/tools/simulations/kinematics/physics';
import { niceScale } from '../src/lib/tools/simulations/kinematics/scales';
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

test('x(0) = x0', () => {
  const current = params({ x0: 12, v0: 3, a: 2, duration: 5 });
  approxEqual(positionAt(current, 0), 12);
});

test('v(0) = v0', () => {
  const current = params({ x0: 0, v0: -7, a: 1, duration: 5 });
  approxEqual(velocityAt(current, 0), -7);
});

test('x(t) = x0 + v0 t + a t^2 / 2', () => {
  const current = params({ x0: 0, v0: 10, a: 2, duration: 10 });
  approxEqual(positionAt(current, 10), 200);
  approxEqual(positionAt(current, 5), 75);
});

test('v(t) = v0 + a t', () => {
  const current = params({ x0: 0, v0: 10, a: 2, duration: 10 });
  approxEqual(velocityAt(current, 10), 30);
});

test('a = 0 gives linear x and constant v', () => {
  const current = params({ x0: 1000, v0: -50, a: 0, duration: 20 });
  approxEqual(positionAt(current, 20), 0);
  approxEqual(velocityAt(current, 0), -50);
  approxEqual(velocityAt(current, 20), -50);
});

test('v0 = 0 starts from rest', () => {
  const current = params({ x0: 0, v0: 0, a: 4, duration: 3 });
  approxEqual(positionAt(current, 3), 18);
  approxEqual(velocityAt(current, 3), 12);
});

test('negative v0 moves left', () => {
  const current = params({ x0: 0, v0: -10, a: 0, duration: 4 });
  approxEqual(positionAt(current, 4), -40);
  assert.ok(velocityAt(current, 2) < 0);
});

test('negative a can reverse direction', () => {
  const current = params({ x0: 0, v0: 20, a: -2, duration: 15 });
  approxEqual(velocityAt(current, 10), 0);
  assert.ok(velocityAt(current, 15) < 0);
  approxEqual(positionAt(current, 10), 100);
  approxEqual(positionAt(current, 15), 75);
});

test('large coordinate ranges stay finite', () => {
  const current = params({ x0: 1500, v0: 100, a: 5, duration: 40 });
  const x = positionAt(current, 40);
  const v = velocityAt(current, 40);
  assert.ok(Number.isFinite(x));
  assert.ok(Number.isFinite(v));
  assert.ok(Math.abs(x) < 1e9);
});

test('niceScale produces readable ticks', () => {
  const scale = niceScale(0, 200, 6);
  assert.ok(scale.step > 0);
  assert.ok(scale.ticks.length >= 2);
  assert.ok(scale.min <= 0);
  assert.ok(scale.max >= 200);
  for (const tick of scale.ticks) {
    assert.ok(Number.isFinite(tick));
    // Prefer multiples of 1/2/5 pattern via step.
    approxEqual(tick % scale.step, 0, 1e-6);
  }
});

test('niceScale handles equal min/max', () => {
  const scale = niceScale(5, 5, 5);
  assert.ok(scale.max > scale.min);
  assert.ok(scale.ticks.length >= 2);
});

test('buildScales covers x and v extents', () => {
  const current = params({ x0: 0, v0: 20, a: -2, duration: 15 });
  const scales = buildScales(current);
  const xExt = computeXExtents(current);
  const vExt = computeVExtents(current);
  assert.ok(scales.x.min <= xExt.min);
  assert.ok(scales.x.max >= xExt.max);
  assert.ok(scales.v.min <= vExt.min);
  assert.ok(scales.v.max >= vExt.max);
  assert.ok(scales.time.min <= 0);
  assert.ok(scales.time.max >= 15);
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

test('T = 0 is a valid research start, not temperature', () => {
  const current = params({ x0: 5, v0: 3, a: 1, duration: 0 });
  const live = liveStateAt(current, 0);
  approxEqual(live.time, 0);
  approxEqual(live.x, 5);
  approxEqual(live.v, 3);
  const samples = sampleGraphs(current);
  assert.equal(samples.length, 1);
  approxEqual(samples[0]!.t, 0);
});

test('x extents include parabola vertex inside interval', () => {
  const current = params({ x0: 0, v0: 20, a: -2, duration: 15 });
  const ext = computeXExtents(current);
  approxEqual(ext.max, 100);
  approxEqual(ext.min, 0);
});

if (errors.length > 0) {
  console.error('verify-kinematics-equation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-kinematics-equation: ${passed} tests passed`);
