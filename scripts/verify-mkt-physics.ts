import assert from 'node:assert/strict';
import {
  COLLISION_PRESSURE_THRESHOLD,
  MAX_TEMPERATURE_K,
  MAX_VISUAL_PARTICLES,
  MIN_TEMPERATURE_K,
  MIN_VISUAL_PARTICLES,
  MKT_DEFAULT_PARAMS,
  R_GAS,
} from '../src/lib/tools/simulations/mkt/constants';
import { getGasById } from '../src/lib/tools/simulations/mkt/gases';
import {
  addGasComponent,
  allocateVisualCounts,
  celsiusToKelvin,
  clampTemperatureK,
  computeMacroState,
  createMktSnapshot,
  createVesselBounds,
  idealGasPressurePa,
  kelvinToCelsius,
  meanSpeedMps,
  molesToVisualCount,
  mixturePressurePa,
  partialPressurePa,
  removeGasComponent,
  rmsSpeedMps,
  sanitizeParams,
  sanitizeTemperatureInput,
  selectDisplayedPressure,
  syncParticlesToParams,
  totalMoles,
} from '../src/lib/tools/simulations/mkt/physics';
import type { GasComponent, MktParams } from '../src/lib/tools/simulations/mkt/types';

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

function approxEqual(actual: number, expected: number, epsilon = 1e-6): void {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${expected}, got ${actual}`,
  );
}

function params(partial: Partial<MktParams> = {}): MktParams {
  return sanitizeParams({ ...MKT_DEFAULT_PARAMS, ...partial });
}

function components(items: Array<Partial<GasComponent> & { gasId: string; moles: number }>): GasComponent[] {
  return items.map((item, index) => ({
    id: item.id ?? `component-${index + 1}`,
    gasId: item.gasId,
    moles: item.moles,
  }));
}

test('PV = νRT', () => {
  const current = params({ temperatureK: 300, volumeL: 22.4, components: components([{ gasId: 'n2', moles: 1 }]) });
  const macro = computeMacroState(current);
  const expected = (macro.totalMoles * R_GAS * macro.temperatureK) / macro.volumeM3;
  approxEqual(macro.pressurePa, expected, 1e-6);
  approxEqual(macro.pressurePa * macro.volumeM3, macro.totalMoles * R_GAS * macro.temperatureK, 1e-6);
});

test('increasing ν increases P', () => {
  const low = computeMacroState(params({ components: components([{ gasId: 'n2', moles: 0.5 }]) }));
  const high = computeMacroState(params({ components: components([{ gasId: 'n2', moles: 2 }]) }));
  assert.ok(high.pressurePa > low.pressurePa);
  approxEqual(high.pressurePa / low.pressurePa, 4, 1e-6);
});

test('increasing T increases P', () => {
  const cold = computeMacroState(params({ temperatureK: 200 }));
  const hot = computeMacroState(params({ temperatureK: 400 }));
  assert.ok(hot.pressurePa > cold.pressurePa);
  approxEqual(hot.pressurePa / cold.pressurePa, 2, 1e-6);
});

test('increasing V decreases P', () => {
  const small = computeMacroState(params({ volumeL: 10 }));
  const large = computeMacroState(params({ volumeL: 40 }));
  assert.ok(large.pressurePa < small.pressurePa);
  approxEqual(small.pressurePa / large.pressurePa, 4, 1e-6);
});

test('mixture Ptotal = P1 + P2', () => {
  const mix = params({
    temperatureK: 300,
    volumeL: 20,
    components: components([
      { gasId: 'n2', moles: 1 },
      { gasId: 'o2', moles: 0.5 },
    ]),
  });
  const p1 = partialPressurePa(1, 300, 20);
  const p2 = partialPressurePa(0.5, 300, 20);
  const total = mixturePressurePa(mix.components, 300, 20);
  approxEqual(total, p1 + p2, 1e-6);
  const macro = computeMacroState(mix);
  approxEqual(macro.pressurePa, p1 + p2, 1e-6);
  approxEqual(macro.partialPressuresPa['component-1'] ?? 0, p1, 1e-6);
  approxEqual(macro.partialPressuresPa['component-2'] ?? 0, p2, 1e-6);
});

test('T(K) ↔ °C conversion', () => {
  approxEqual(kelvinToCelsius(273.15), 0, 1e-9);
  approxEqual(celsiusToKelvin(0), 273.15, 1e-9);
  approxEqual(kelvinToCelsius(300), 26.85, 1e-9);
  approxEqual(celsiusToKelvin(26.85), 300, 1e-9);
  approxEqual(sanitizeTemperatureInput(26.85, 'C'), 300, 1e-6);
  approxEqual(sanitizeTemperatureInput(300, 'K'), 300, 1e-6);
});

test('lighter gas has greater characteristic speed at the same T', () => {
  const t = 300;
  const hydrogen = meanSpeedMps(t, getGasById('h2').molarMassGPerMol / 1000);
  const helium = meanSpeedMps(t, getGasById('he').molarMassGPerMol / 1000);
  const nitrogen = meanSpeedMps(t, getGasById('n2').molarMassGPerMol / 1000);
  const krypton = meanSpeedMps(t, getGasById('kr').molarMassGPerMol / 1000);
  assert.ok(hydrogen > helium);
  assert.ok(helium > nitrogen);
  assert.ok(nitrogen > krypton);
  assert.ok(rmsSpeedMps(t, 0.002) > rmsSpeedMps(t, 0.028));
});

test('temperature cannot become ≤ 0 K', () => {
  assert.equal(clampTemperatureK(0), MIN_TEMPERATURE_K);
  assert.equal(clampTemperatureK(-40), MIN_TEMPERATURE_K);
  assert.equal(clampTemperatureK(Number.NaN), 300);
  assert.ok(sanitizeTemperatureInput(-500, 'C') >= MIN_TEMPERATURE_K);
  assert.ok(sanitizeTemperatureInput(-10, 'K') >= MIN_TEMPERATURE_K);
  assert.equal(clampTemperatureK(5000), MAX_TEMPERATURE_K);
  const safe = sanitizeParams(params({ temperatureK: -12 }));
  assert.ok(safe.temperatureK > 0);
});

test('visual particle count is bounded and not equal to ν', () => {
  const low = molesToVisualCount(0.1);
  const mid = molesToVisualCount(1);
  const high = molesToVisualCount(20);
  assert.ok(low >= MIN_VISUAL_PARTICLES);
  assert.ok(high <= MAX_VISUAL_PARTICLES);
  assert.ok(mid > low);
  assert.ok(high >= mid);
  assert.notEqual(mid, 1);
  assert.ok(high <= MAX_VISUAL_PARTICLES);
  const counts = allocateVisualCounts(components([{ gasId: 'n2', moles: 1 }]));
  const visual = Object.values(counts).reduce((sum, n) => sum + n, 0);
  assert.ok(visual >= MIN_VISUAL_PARTICLES && visual <= MAX_VISUAL_PARTICLES);
});

test('changing a gas in a mixture does not break the mixture', () => {
  const mix = params({
    components: components([
      { id: 'a', gasId: 'n2', moles: 1 },
      { id: 'b', gasId: 'o2', moles: 0.5 },
    ]),
  });
  const before = computeMacroState(mix);
  const swapped: MktParams = {
    ...mix,
    components: mix.components.map((item) =>
      item.id === 'b' ? { ...item, gasId: 'he' } : item,
    ),
  };
  const after = computeMacroState(swapped);
  approxEqual(after.totalMoles, before.totalMoles, 1e-9);
  approxEqual(after.pressurePa, before.pressurePa, 1e-6);
  assert.equal(swapped.components[1]?.gasId, 'he');
  const bounds = createVesselBounds(swapped.volumeL);
  const particles = syncParticlesToParams([], swapped, bounds);
  assert.ok(particles.some((particle) => particle.gasId === 'he'));
  assert.ok(particles.some((particle) => particle.gasId === 'n2'));
});

test('removing a mixture component recalculates pressure', () => {
  const mix = params({
    components: components([
      { id: 'a', gasId: 'n2', moles: 1 },
      { id: 'b', gasId: 'o2', moles: 1 },
    ]),
  });
  const before = computeMacroState(mix);
  const remaining = removeGasComponent(mix.components, 'b');
  assert.equal(remaining.length, 1);
  const after = computeMacroState({ ...mix, components: remaining });
  approxEqual(after.pressurePa, before.pressurePa / 2, 1e-6);
  approxEqual(after.totalMoles, 1, 1e-9);
  assert.equal(removeGasComponent(remaining, 'a').length, 1);
});

test('few visual molecules start at P = 0 until a wall hit', () => {
  const selected = selectDisplayedPressure(20, 101325, 0, 0);
  assert.equal(selected.pressurePa, 0);
  assert.equal(selected.usingCollisionPressure, true);
  const afterHit = selectDisplayedPressure(20, 101325, 12, 3);
  assert.equal(afterHit.pressurePa, 101325);
  const many = selectDisplayedPressure(200, 101325, 0, 0);
  assert.equal(many.usingCollisionPressure, false);
  assert.equal(many.pressurePa, 101325);
  assert.ok(COLLISION_PRESSURE_THRESHOLD < MAX_VISUAL_PARTICLES);
});

test('adding a gas increases total moles and pressure', () => {
  const start = params();
  const next = addGasComponent(start.components);
  assert.ok(next.length > start.components.length);
  const before = idealGasPressurePa(totalMoles(start.components), 300, 22.4);
  const after = idealGasPressurePa(totalMoles(next), 300, 22.4);
  assert.ok(after > before);
});

test('snapshot uses collision pressure at very low visual N', () => {
  const snapshot = createMktSnapshot(
    params({ components: components([{ gasId: 'h2', moles: 0.1 }]) }),
  );
  if (snapshot.runtime.visualMoleculeCount <= COLLISION_PRESSURE_THRESHOLD) {
    assert.equal(snapshot.runtime.displayedPressurePa, 0);
    assert.equal(snapshot.runtime.usingCollisionPressure, true);
  } else {
    assert.ok(snapshot.macro.pressurePa > 0);
  }
});

if (errors.length > 0) {
  console.error(`Failed ${errors.length} of ${passed + errors.length} tests`);
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log(`verify-mkt-physics: ${passed} tests passed`);
