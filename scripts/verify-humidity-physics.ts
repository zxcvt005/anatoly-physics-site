import assert from 'node:assert/strict';
import {
  HUMIDITY_DEFAULT_PARAMS,
  HUMIDITY_RANGES,
} from '../src/lib/tools/simulations/humidity/constants';
import {
  concentrationFromDensity,
  createHumiditySnapshot,
  createPhaseMassesAllVapor,
  densityFromPressure,
  buildSnapshotFromMasses,
  patchParams,
  pressureFromDensity,
  reconcilePhaseMasses,
  relativeHumidityPercent,
  requestedTotalMassKg,
  resolveHumidityState,
  sanitizeParams,
  stepPhaseMasses,
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

test('RH < 100% for unsaturated vapor', () => {
  const snap = resolveHumidityState(
    params({
      temperatureC: 20,
      volumeM3: 1,
      controlMode: 'density',
      densityKgM3: 0.008,
    }),
  );
  assert.ok(snap.relativeHumidityPercent < 100);
  assert.ok(snap.relativeHumidityPercent > 0);
});

test('live supersaturation allows RH > 100% before condensation settles', () => {
  const current = params({
    temperatureC: 20,
    volumeM3: 0.4,
    controlMode: 'mass',
    massKg: 0.02,
  });
  let masses = createPhaseMassesAllVapor(current);
  const first = buildSnapshotFromMasses(current, masses);
  assert.ok(first.relativeHumidityPercent > 100);
  assert.ok(first.vaporPressureKPa > first.pSatKPa);

  for (let i = 0; i < 200; i += 1) {
    const stepped = stepPhaseMasses(masses, current, 1 / 30);
    masses = stepped.masses;
  }
  const settled = buildSnapshotFromMasses(current, masses);
  assert.ok(settled.relativeHumidityPercent <= 101);
  assert.ok(settled.liquidMassKg > 0);
  approxEqual(settled.vaporMassKg + settled.liquidMassKg, 0.02, 1e-9);
  assert.ok(settled.vaporMassKg >= 0);
  assert.ok(settled.liquidMassKg >= 0);
});

test('gradual condensation reduces vapor and grows liquid', () => {
  const current = params({
    temperatureC: 20,
    volumeM3: 0.5,
    controlMode: 'mass',
    massKg: 0.03,
  });
  let masses = createPhaseMassesAllVapor(current);
  const start = buildSnapshotFromMasses(current, masses);
  const mid = stepPhaseMasses(masses, current, 0.2);
  masses = mid.masses;
  assert.equal(mid.process, 'condense');
  assert.ok(mid.intensity > 0);
  assert.ok(masses.vaporMassKg < start.vaporMassKg);
  assert.ok(masses.liquidMassKg > start.liquidMassKg);
  approxEqual(masses.vaporMassKg + masses.liquidMassKg, 0.03, 1e-9);
});

test('gradual evaporation reduces liquid and grows vapor', () => {
  const compressed = params({
    temperatureC: 20,
    volumeM3: 0.3,
    controlMode: 'mass',
    massKg: 0.025,
  });
  let masses = createPhaseMassesAllVapor(compressed);
  for (let i = 0; i < 100; i += 1) {
    masses = stepPhaseMasses(masses, compressed, 1 / 30).masses;
  }
  assert.ok(masses.liquidMassKg > 1e-4);

  const expanded = params({
    temperatureC: 20,
    volumeM3: 1.8,
    controlMode: 'mass',
    massKg: 0.025,
  });
  masses = reconcilePhaseMasses(masses, requestedTotalMassKg(expanded));
  const liquidBefore = masses.liquidMassKg;
  const vaporBefore = masses.vaporMassKg;
  const step = stepPhaseMasses(masses, expanded, 0.25);
  assert.equal(step.process, 'evaporate');
  assert.ok(step.masses.liquidMassKg < liquidBefore);
  assert.ok(step.masses.vaporMassKg > vaporBefore);
  approxEqual(
    step.masses.vaporMassKg + step.masses.liquidMassKg,
    0.025,
    1e-9,
  );
});

test('evaporation stops when liquid is gone', () => {
  const current = params({
    temperatureC: 20,
    volumeM3: 2,
    controlMode: 'mass',
    massKg: 0.005,
  });
  let masses = {
    vaporMassKg: 0.004,
    liquidMassKg: 0.001,
  };
  for (let i = 0; i < 120; i += 1) {
    const stepped = stepPhaseMasses(masses, current, 1 / 30);
    masses = stepped.masses;
  }
  assert.ok(masses.liquidMassKg < 1e-6);
  const snap = buildSnapshotFromMasses(current, masses);
  assert.ok(snap.relativeHumidityPercent < 100);
  assert.equal(snap.process, 'none');
});

test('relativeHumidityPercent helper is uncapped', () => {
  const rh = relativeHumidityPercent(0.05, 1, 20);
  assert.ok(rh > 100);
});

test('P ρ n change during condensation', () => {
  const current = params({
    temperatureC: 20,
    volumeM3: 0.35,
    controlMode: 'mass',
    massKg: 0.02,
  });
  let masses = createPhaseMassesAllVapor(current);
  const before = buildSnapshotFromMasses(current, masses);
  for (let i = 0; i < 40; i += 1) {
    masses = stepPhaseMasses(masses, current, 1 / 30).masses;
  }
  const after = buildSnapshotFromMasses(current, masses);
  assert.ok(after.vaporPressureKPa < before.vaporPressureKPa);
  assert.ok(after.vaporDensityKgM3 < before.vaporDensityKgM3);
  assert.ok(after.vaporConcentrationPerM3 < before.vaporConcentrationPerM3);
});

if (errors.length > 0) {
  console.error('verify-humidity-physics failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-humidity-physics: ${passed} tests passed`);
