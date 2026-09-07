import assert from 'node:assert/strict';
import {
  HUMIDITY_DEFAULT_PARAMS,
  HUMIDITY_RANGES,
} from '../src/lib/tools/simulations/humidity/constants';
import {
  concentrationFromDensity,
  createHumiditySnapshot,
  densityFromPressure,
  patchParams,
  pressureFromDensity,
  requestedTotalMassKg,
  resolveHumidityState,
  sanitizeParams,
} from '../src/lib/tools/simulations/humidity/physics';
import {
  saturationDensityKgM3,
  saturationPressureKPa,
} from '../src/lib/tools/simulations/humidity/saturation';
import type { HumidityParams } from '../src/lib/tools/simulations/humidity/types';

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

function approxEqual(actual: number, expected: number, epsilon = 1e-3): void {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${expected}, got ${actual}`,
  );
}

function params(partial: Partial<HumidityParams> = {}): HumidityParams {
  return sanitizeParams({ ...HUMIDITY_DEFAULT_PARAMS, ...partial });
}

test('1. Pнас(20 °C) ≈ 2.339 кПа', () => {
  approxEqual(saturationPressureKPa(20), 2.339, 0.01);
});

test('2. Pнас(100 °C) ≈ 101.325 кПа', () => {
  approxEqual(saturationPressureKPa(100), 101.325, 0.05);
});

test('3. unsaturated vapor has P < Pнас', () => {
  const current = params({
    temperatureC: 20,
    volumeM3: 1,
    controlMode: 'density',
    densityKgM3: 0.008,
  });
  const snap = resolveHumidityState(current);
  assert.equal(snap.phase, 'unsaturated');
  assert.ok(snap.vaporPressureKPa < snap.pSatKPa);
});

test('4. saturated vapor has P = Pнас', () => {
  const rhoSat = saturationDensityKgM3(20);
  const current = params({
    temperatureC: 20,
    volumeM3: 1,
    controlMode: 'density',
    densityKgM3: rhoSat,
  });
  const snap = resolveHumidityState(current);
  assert.ok(snap.phase === 'saturated' || snap.phase === 'with_liquid');
  approxEqual(snap.vaporPressureKPa, snap.pSatKPa, 1e-6);
});

test('5. exceeding saturation clamps P and forms liquid', () => {
  const current = params({
    temperatureC: 20,
    volumeM3: 1,
    controlMode: 'density',
    densityKgM3: 0.05,
  });
  const snap = resolveHumidityState(current);
  assert.ok(snap.vaporPressureKPa <= snap.pSatKPa + 1e-9);
  approxEqual(snap.vaporDensityKgM3, snap.rhoSatKgM3, 1e-6);
  assert.ok(snap.liquidMassKg > 0);
  assert.equal(snap.phase, 'with_liquid');
});

test('6. compressing past saturation keeps P=Pнас and grows liquid', () => {
  let current = params({
    temperatureC: 20,
    volumeM3: 1,
    controlMode: 'mass',
    massKg: 0.0173,
  });
  let snap = resolveHumidityState(current);
  approxEqual(snap.vaporPressureKPa, snap.pSatKPa, 0.05);

  current = patchParams(current, { volumeM3: 0.4 });
  snap = resolveHumidityState(current);
  approxEqual(snap.vaporPressureKPa, snap.pSatKPa, 1e-6);
  approxEqual(snap.vaporDensityKgM3, snap.rhoSatKgM3, 1e-6);
  assert.ok(snap.liquidMassKg > 0);
});

test('7. expanding with liquid causes evaporation', () => {
  let current = params({
    temperatureC: 20,
    volumeM3: 0.3,
    controlMode: 'mass',
    massKg: 0.03,
  });
  let snap = resolveHumidityState(current);
  const liquidBefore = snap.liquidMassKg;
  assert.ok(liquidBefore > 0);

  current = patchParams(current, { volumeM3: 0.8 });
  snap = resolveHumidityState(current);
  assert.ok(snap.liquidMassKg < liquidBefore);
  approxEqual(snap.vaporPressureKPa, snap.pSatKPa, 1e-6);
});

test('8. after liquid gone, further expansion lowers pressure', () => {
  let current = params({
    temperatureC: 20,
    volumeM3: 0.5,
    controlMode: 'mass',
    massKg: 0.01,
  });
  // Expand until unsaturated
  current = patchParams(current, { volumeM3: 1.5 });
  let snap = resolveHumidityState(current);
  assert.equal(snap.liquidMassKg < 1e-9, true);
  assert.equal(snap.phase, 'unsaturated');
  const p1 = snap.vaporPressureKPa;

  current = patchParams(current, { volumeM3: 2 });
  snap = resolveHumidityState(current);
  assert.ok(snap.vaporPressureKPa < p1);
});

test('9. pressure mode', () => {
  const current = params({
    temperatureC: 20,
    volumeM3: 1,
    controlMode: 'pressure',
    pressureKPa: 1.0,
  });
  const snap = resolveHumidityState(current);
  assert.equal(snap.phase, 'unsaturated');
  approxEqual(snap.vaporPressureKPa, 1.0, 0.02);

  const over = resolveHumidityState(
    params({
      temperatureC: 20,
      volumeM3: 1,
      controlMode: 'pressure',
      pressureKPa: 10,
    }),
  );
  approxEqual(over.vaporPressureKPa, over.pSatKPa, 1e-6);
  assert.ok(over.liquidMassKg > 0);
});

test('10. density mode', () => {
  const snap = resolveHumidityState(
    params({
      temperatureC: 20,
      volumeM3: 1,
      controlMode: 'density',
      densityKgM3: 0.01,
    }),
  );
  approxEqual(snap.vaporDensityKgM3, 0.01, 1e-6);
  assert.equal(snap.phase, 'unsaturated');
});

test('11. concentration mode', () => {
  const rho = 0.01;
  const n = concentrationFromDensity(rho);
  const snap = resolveHumidityState(
    params({
      temperatureC: 20,
      volumeM3: 1,
      controlMode: 'concentration',
      concentrationPerM3: n,
    }),
  );
  approxEqual(snap.vaporDensityKgM3, rho, 1e-6);
});

test('12. mass mode', () => {
  const snap = resolveHumidityState(
    params({
      temperatureC: 20,
      volumeM3: 1,
      controlMode: 'mass',
      massKg: 0.05,
    }),
  );
  approxEqual(snap.totalMassKg, 0.05, 1e-9);
  approxEqual(snap.vaporMassKg + snap.liquidMassKg, 0.05, 1e-9);
  assert.ok(snap.liquidMassKg > 0);
});

test('13. T = 0 °C checkpoints', () => {
  approxEqual(saturationPressureKPa(0), 0.611, 0.01);
  approxEqual(saturationDensityKgM3(0), 0.00485, 0.0002);
  const snap = createHumiditySnapshot(
    params({ temperatureC: 0, controlMode: 'density', densityKgM3: 0.002 }),
  );
  assert.ok(Number.isFinite(snap.vaporPressureKPa));
  assert.equal(snap.phase, 'unsaturated');
});

test('14. T = 100 °C checkpoints', () => {
  approxEqual(saturationPressureKPa(100), 101.325, 0.05);
  approxEqual(saturationDensityKgM3(100), 0.598, 0.005);
  const snap = createHumiditySnapshot(
    params({
      temperatureC: 100,
      controlMode: 'mass',
      massKg: 0.5,
      volumeM3: 0.5,
    }),
  );
  approxEqual(snap.vaporPressureKPa, snap.pSatKPa, 1e-6);
  assert.ok(snap.liquidMassKg > 0);
});

test('15. no NaN/Infinity from sanitize and resolve', () => {
  const current = sanitizeParams({
    temperatureC: Number.NaN,
    volumeM3: Number.POSITIVE_INFINITY,
    pressureKPa: Number.NEGATIVE_INFINITY,
    densityKgM3: Number.NaN,
    concentrationPerM3: Number.NaN,
    massKg: Number.NaN,
  });
  const snap = resolveHumidityState(current);
  for (const value of [
    current.temperatureC,
    current.volumeM3,
    snap.vaporPressureKPa,
    snap.vaporDensityKgM3,
    snap.vaporMassKg,
    snap.liquidMassKg,
    snap.pSatKPa,
    snap.rhoSatKgM3,
  ]) {
    assert.ok(Number.isFinite(value));
  }
});

test('extra: ideal-gas P from density matches helper', () => {
  const rho = 0.01;
  const T = 20;
  const p = pressureFromDensity(rho, T);
  approxEqual(densityFromPressure(p, T), rho, 1e-9);
});

test('extra: T range clamp', () => {
  assert.equal(sanitizeParams({ temperatureC: -5 }).temperatureC, 0);
  assert.equal(sanitizeParams({ temperatureC: 120 }).temperatureC, 100);
  assert.equal(HUMIDITY_RANGES.volumeM3.min, 0.2);
  assert.equal(HUMIDITY_RANGES.volumeM3.max, 2);
});

test('extra: requested mass grows with volume in density mode', () => {
  const a = params({
    controlMode: 'density',
    densityKgM3: 0.01,
    volumeM3: 0.5,
  });
  const b = params({
    controlMode: 'density',
    densityKgM3: 0.01,
    volumeM3: 1.5,
  });
  assert.ok(requestedTotalMassKg(b) > requestedTotalMassKg(a));
});

if (errors.length > 0) {
  console.error('verify-humidity-physics failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-humidity-physics: ${passed} tests passed`);
