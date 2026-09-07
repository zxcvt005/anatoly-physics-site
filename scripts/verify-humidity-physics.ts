import assert from 'node:assert/strict';
import {
  HUMIDITY_DEFAULT_PARAMS,
  HUMIDITY_RANGES,
} from '../src/lib/tools/simulations/humidity/constants';
import {
  concentrationFromDensity,
  createHumiditySnapshot,
  createPhaseMassesAllVapor,
  densityFromConcentration,
  densityFromPressure,
  buildSnapshotFromMasses,
  clampCustomRelativeHumidityPercent,
  clampVolumeM3,
  getAdaptiveControlRanges,
  paramsFromRelativeHumidity,
  patchParams,
  pressureFromDensity,
  quantitiesForRelativeHumidity,
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

const ADAPTIVE_CHECK_TEMPERATURES_C = [0, 5, 10, 20, 50, 80, 100] as const;

test('adaptive: max Mass gives RH ≈ 180% at each T', () => {
  for (const T of ADAPTIVE_CHECK_TEMPERATURES_C) {
    const V = 1;
    const ranges = getAdaptiveControlRanges(T, V);
    const rh = relativeHumidityPercent(ranges.massKg.max, V, T);
    approxEqual(rh, 180, 0.5);
    assert.ok(Number.isFinite(ranges.massKg.max));
    assert.ok(ranges.massKg.max > 0);
    assert.equal(ranges.massKg.min, 0);
  }
});

test('adaptive: max Pressure gives RH ≈ 180% at each T', () => {
  for (const T of ADAPTIVE_CHECK_TEMPERATURES_C) {
    const ranges = getAdaptiveControlRanges(T, 1);
    const rho = densityFromPressure(ranges.pressureKPa.max, T);
    const rh = (rho / saturationDensityKgM3(T)) * 100;
    approxEqual(rh, 180, 0.5);
    // Matches 1.8·ρнас via ideal gas; close to 1.8·Pнас from the table.
    approxEqual(
      ranges.pressureKPa.max,
      pressureFromDensity(1.8 * saturationDensityKgM3(T), T),
      1e-9,
    );
  }
});

test('adaptive: max Density gives RH ≈ 180% at each T', () => {
  for (const T of ADAPTIVE_CHECK_TEMPERATURES_C) {
    const ranges = getAdaptiveControlRanges(T, 1);
    const rh = (ranges.densityKgM3.max / saturationDensityKgM3(T)) * 100;
    approxEqual(rh, 180, 1e-6);
  }
});

test('adaptive: max Concentration gives RH ≈ 180% at each T', () => {
  for (const T of ADAPTIVE_CHECK_TEMPERATURES_C) {
    const ranges = getAdaptiveControlRanges(T, 1);
    const rho = densityFromConcentration(ranges.concentrationPerM3.max);
    const rh = (rho / saturationDensityKgM3(T)) * 100;
    approxEqual(rh, 180, 1e-6);
  }
});

test('adaptive: max values shrink when T decreases', () => {
  const high = getAdaptiveControlRanges(80, 1);
  const low = getAdaptiveControlRanges(10, 1);
  assert.ok(low.massKg.max < high.massKg.max);
  assert.ok(low.pressureKPa.max < high.pressureKPa.max);
  assert.ok(low.densityKgM3.max < high.densityKgM3.max);
  assert.ok(low.concentrationPerM3.max < high.concentrationPerM3.max);
});

test('adaptive: max values grow when T increases', () => {
  const low = getAdaptiveControlRanges(5, 1);
  const high = getAdaptiveControlRanges(50, 1);
  assert.ok(high.massKg.max > low.massKg.max);
  assert.ok(high.pressureKPa.max > low.pressureKPa.max);
  assert.ok(high.densityKgM3.max > low.densityKgM3.max);
  assert.ok(high.concentrationPerM3.max > low.concentrationPerM3.max);
});

test('adaptive: Mass max scales with volume', () => {
  const T = 20;
  const small = getAdaptiveControlRanges(T, 0.4);
  const large = getAdaptiveControlRanges(T, 1.6);
  approxEqual(large.massKg.max / small.massKg.max, 1.6 / 0.4, 1e-9);
  approxEqual(
    small.massKg.max,
    1.8 * saturationDensityKgM3(T) * 0.4,
    1e-12,
  );
  // Density / pressure / concentration max do not depend on V.
  approxEqual(small.densityKgM3.max, large.densityKgM3.max, 1e-12);
  approxEqual(small.pressureKPa.max, large.pressureKPa.max, 1e-12);
});

test('adaptive: lowering T clamps mass into new UI max', () => {
  const start = params({
    temperatureC: 80,
    volumeM3: 1,
    controlMode: 'mass',
    massKg: getAdaptiveControlRanges(80, 1).massKg.max,
  });
  const next = patchParams(start, { temperatureC: 20 });
  const max20 = getAdaptiveControlRanges(20, 1).massKg.max;
  approxEqual(next.massKg, max20, 1e-12);
  assert.ok(next.massKg < start.massKg);
});

test('adaptive: shrinking V clamps mass into new UI max', () => {
  const start = params({
    temperatureC: 20,
    volumeM3: 1.5,
    controlMode: 'mass',
    massKg: getAdaptiveControlRanges(20, 1.5).massKg.max,
  });
  const next = patchParams(start, { volumeM3: 0.5 });
  const maxSmall = getAdaptiveControlRanges(20, 0.5).massKg.max;
  approxEqual(next.massKg, maxSmall, 1e-12);
});

test('adaptive: ranges stay finite and non-negative', () => {
  for (const T of ADAPTIVE_CHECK_TEMPERATURES_C) {
    for (const V of [0.2, 1, 2]) {
      const ranges = getAdaptiveControlRanges(T, V);
      for (const key of [
        'pressureKPa',
        'densityKgM3',
        'concentrationPerM3',
        'massKg',
      ] as const) {
        const range = ranges[key];
        assert.ok(Number.isFinite(range.min));
        assert.ok(Number.isFinite(range.max));
        assert.ok(Number.isFinite(range.step));
        assert.ok(range.min >= 0);
        assert.ok(range.max > 0);
        assert.ok(range.step > 0);
        assert.ok(range.max < Infinity);
      }
    }
  }
});

test('volume: absolute max is 2 m³', () => {
  assert.equal(HUMIDITY_RANGES.volumeM3.max, 2);
  assert.equal(clampVolumeM3(2), 2);
  assert.equal(clampVolumeM3(2.01), 2);
  assert.equal(clampVolumeM3(99), 2);
  assert.equal(sanitizeParams({ volumeM3: 5 }).volumeM3, 2);
  assert.equal(patchParams(params(), { volumeM3: 8 }).volumeM3, 2);
  assert.ok(clampVolumeM3(0.1) >= HUMIDITY_RANGES.volumeM3.min);
});

test('volume: numeric / programmatic input above 2 is clamped', () => {
  const next = sanitizeParams({
    ...HUMIDITY_DEFAULT_PARAMS,
    volumeM3: 2.5,
  });
  assert.equal(next.volumeM3, 2);
  assert.ok(next.volumeM3 <= 2);
});

test('custom RH 50%: P, rho, m_vapor, n match formulas', () => {
  const T = 20;
  const V = 1;
  const q = quantitiesForRelativeHumidity(50, T, V);
  approxEqual(q.vaporDensityKgM3, 0.5 * saturationDensityKgM3(T), 1e-12);
  approxEqual(q.vaporPressureKPa, 0.5 * saturationPressureKPa(T), 1e-12);
  approxEqual(q.vaporMassKg, q.vaporDensityKgM3 * V, 1e-12);
  approxEqual(
    q.vaporConcentrationPerM3,
    concentrationFromDensity(q.vaporDensityKgM3),
    1e-6,
  );
  approxEqual(q.relativeHumidityPercent, 50, 1e-9);

  const applied = paramsFromRelativeHumidity(
    params({ temperatureC: T, volumeM3: V }),
    50,
  );
  assert.equal(applied.controlMode, 'mass');
  approxEqual(applied.massKg, q.vaporMassKg, 1e-12);
  approxEqual(applied.densityKgM3, q.vaporDensityKgM3, 1e-12);
  approxEqual(applied.pressureKPa, q.vaporPressureKPa, 1e-12);
  approxEqual(applied.concentrationPerM3, q.vaporConcentrationPerM3, 1e-3);

  const live = buildSnapshotFromMasses(
    applied,
    createPhaseMassesAllVapor(applied),
  );
  approxEqual(live.relativeHumidityPercent, 50, 0.5);
  approxEqual(live.vaporDensityKgM3, q.vaporDensityKgM3, 1e-9);
  approxEqual(live.vaporMassKg, q.vaporMassKg, 1e-9);
  assert.ok(live.vaporPressureKPa > 0);
  assert.ok(live.vaporConcentrationPerM3 > 0);
});

test('custom RH 100%: saturation', () => {
  const applied = paramsFromRelativeHumidity(
    params({ temperatureC: 20, volumeM3: 1 }),
    100,
  );
  const live = buildSnapshotFromMasses(
    applied,
    createPhaseMassesAllVapor(applied),
  );
  approxEqual(live.relativeHumidityPercent, 100, 0.5);
  approxEqual(live.vaporDensityKgM3, saturationDensityKgM3(20), 1e-9);
  assert.ok(live.liquidMassKg < 1e-9);
});

test('custom RH 150%: supersaturated start + condensation conserves mass', () => {
  const applied = paramsFromRelativeHumidity(
    params({ temperatureC: 20, volumeM3: 0.5 }),
    150,
  );
  let masses = createPhaseMassesAllVapor(applied);
  const start = buildSnapshotFromMasses(applied, masses);
  approxEqual(start.relativeHumidityPercent, 150, 0.75);
  assert.ok(start.relativeHumidityPercent > 100);
  assert.ok(start.vaporDensityKgM3 > start.rhoSatKgM3);
  const total = start.totalMassKg;

  const mid = stepPhaseMasses(masses, applied, 0.25);
  assert.equal(mid.process, 'condense');
  masses = mid.masses;
  approxEqual(masses.vaporMassKg + masses.liquidMassKg, total, 1e-9);
  assert.ok(masses.liquidMassKg > 0);
  assert.ok(masses.vaporMassKg < start.vaporMassKg);

  for (let i = 0; i < 180; i += 1) {
    masses = stepPhaseMasses(masses, applied, 1 / 30).masses;
  }
  const settled = buildSnapshotFromMasses(applied, masses);
  approxEqual(settled.vaporMassKg + settled.liquidMassKg, total, 1e-9);
  assert.ok(settled.relativeHumidityPercent <= 101);
  assert.ok(settled.liquidMassKg > 0);
  assert.ok(settled.vaporMassKg >= 0);
  assert.ok(settled.liquidMassKg >= 0);
  assert.ok(settled.vaporPressureKPa >= 0);
  assert.ok(settled.vaporDensityKgM3 >= 0);
  assert.ok(settled.vaporConcentrationPerM3 >= 0);
});

test('custom RH updates P rho n m together', () => {
  const q = quantitiesForRelativeHumidity(75, 25, 1.2);
  assert.ok(Number.isFinite(q.vaporPressureKPa));
  assert.ok(Number.isFinite(q.vaporDensityKgM3));
  assert.ok(Number.isFinite(q.vaporConcentrationPerM3));
  assert.ok(Number.isFinite(q.vaporMassKg));
  approxEqual(q.vaporMassKg, q.vaporDensityKgM3 * 1.2, 1e-12);
});

test('custom RH 70%: one-shot initial state', () => {
  const applied = paramsFromRelativeHumidity(
    params({ temperatureC: 20, volumeM3: 1 }),
    70,
  );
  const live = buildSnapshotFromMasses(
    applied,
    createPhaseMassesAllVapor(applied),
  );
  approxEqual(live.relativeHumidityPercent, 70, 0.5);
  approxEqual(applied.massKg, quantitiesForRelativeHumidity(70, 20, 1).vaporMassKg, 1e-12);
});

test('after Apply RH=70%, V change does NOT restore 70%', () => {
  const applied = paramsFromRelativeHumidity(
    params({ temperatureC: 20, volumeM3: 1, controlMode: 'mass' }),
    70,
  );
  const massKg = applied.massKg;
  // Ordinary physics after Apply: keep mass, change V — no second paramsFromRelativeHumidity(70).
  const afterV = patchParams(applied, { volumeM3: 0.5 });
  assert.equal(afterV.controlMode, 'mass');
  approxEqual(afterV.massKg, massKg, 1e-12);

  const live = buildSnapshotFromMasses(
    afterV,
    createPhaseMassesAllVapor(afterV),
  );
  assert.ok(Math.abs(live.relativeHumidityPercent - 70) > 5);
  assert.ok(live.relativeHumidityPercent > 100);
  approxEqual(live.relativeHumidityPercent, 140, 1);
});

test('after Apply RH=70%, T change does NOT restore 70%', () => {
  const applied = paramsFromRelativeHumidity(
    params({ temperatureC: 20, volumeM3: 1, controlMode: 'mass' }),
    70,
  );
  const massKg = applied.massKg;
  const afterT = patchParams(applied, { temperatureC: 40 });
  approxEqual(afterT.massKg, massKg, 1e-12);

  const live = buildSnapshotFromMasses(
    afterT,
    createPhaseMassesAllVapor(afterT),
  );
  assert.ok(Math.abs(live.relativeHumidityPercent - 70) > 5);
  assert.ok(live.relativeHumidityPercent < 70);
});

test('after Apply RH=70%, shrink V → supersaturation → condense → ~100% not 70%', () => {
  const applied = paramsFromRelativeHumidity(
    params({ temperatureC: 20, volumeM3: 1, controlMode: 'mass' }),
    70,
  );
  const compressed = patchParams(applied, { volumeM3: 0.5 });
  let masses = createPhaseMassesAllVapor(compressed);
  const start = buildSnapshotFromMasses(compressed, masses);
  assert.ok(start.relativeHumidityPercent > 100);
  const total = start.totalMassKg;

  const mid = stepPhaseMasses(masses, compressed, 0.3);
  assert.equal(mid.process, 'condense');
  masses = mid.masses;
  approxEqual(masses.vaporMassKg + masses.liquidMassKg, total, 1e-9);
  assert.ok(masses.liquidMassKg > 0);

  for (let i = 0; i < 200; i += 1) {
    masses = stepPhaseMasses(masses, compressed, 1 / 30).masses;
  }
  const settled = buildSnapshotFromMasses(compressed, masses);
  approxEqual(settled.vaporMassKg + settled.liquidMassKg, total, 1e-9);
  assert.ok(settled.relativeHumidityPercent <= 101);
  assert.ok(Math.abs(settled.relativeHumidityPercent - 70) > 20);
  assert.ok(settled.liquidMassKg > 0);
  assert.ok(settled.vaporMassKg >= 0);
  assert.ok(settled.liquidMassKg >= 0);
});

test('after Apply, free control changes still work', () => {
  let current = paramsFromRelativeHumidity(
    params({ temperatureC: 20, volumeM3: 1 }),
    70,
  );
  const massAfterRh = current.massKg;
  current = patchParams(current, { controlMode: 'density' });
  assert.equal(current.controlMode, 'density');
  current = patchParams(current, { densityKgM3: 0.01 });
  approxEqual(current.densityKgM3, 0.01, 1e-12);
  current = patchParams(current, { temperatureC: 15 });
  assert.equal(current.temperatureC, 15);
  assert.equal(current.controlMode, 'density');
  // Not locked to the original RH=70% mass.
  assert.ok(Math.abs(requestedTotalMassKg(current) - massAfterRh) > 1e-6);
});

test('custom RH: cannot create mass beyond existingTotalMassKg', () => {
  const limited = paramsFromRelativeHumidity(
    params({ temperatureC: 20, volumeM3: 1 }),
    200,
    { existingTotalMassKg: 0.005 },
  );
  approxEqual(limited.massKg, 0.005, 1e-12);
  const live = buildSnapshotFromMasses(
    limited,
    createPhaseMassesAllVapor(limited),
  );
  assert.ok(live.relativeHumidityPercent < 200);
  assert.ok(live.relativeHumidityPercent > 0);
});

test('custom RH: clamp input to 0…500', () => {
  assert.equal(clampCustomRelativeHumidityPercent(-10), 0);
  assert.equal(clampCustomRelativeHumidityPercent(900), 500);
  const q = quantitiesForRelativeHumidity(900, 20, 1);
  assert.equal(q.relativeHumidityPercent, 500);
});

test('custom RH: no NaN / negatives at extremes', () => {
  for (const rh of [0, 1, 100, 180, 500]) {
    for (const T of [0, 20, 100]) {
      for (const V of [0.2, 2]) {
        const q = quantitiesForRelativeHumidity(rh, T, V);
        for (const value of [
          q.vaporPressureKPa,
          q.vaporDensityKgM3,
          q.vaporConcentrationPerM3,
          q.vaporMassKg,
        ]) {
          assert.ok(Number.isFinite(value));
          assert.ok(value >= 0);
          assert.ok(value < Infinity);
        }
        const applied = paramsFromRelativeHumidity(
          params({ temperatureC: T, volumeM3: V }),
          rh,
        );
        assert.ok(applied.volumeM3 <= 2);
        assert.ok(applied.massKg >= 0);
      }
    }
  }
});

if (errors.length > 0) {
  console.error('verify-humidity-physics failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-humidity-physics: ${passed} tests passed`);
