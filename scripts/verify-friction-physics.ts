import assert from 'node:assert/strict';
import {
  FRICTION_BOUNDS,
  FRICTION_DEFAULT_PARAMS,
  G,
} from '../src/lib/tools/simulations/friction/constants';
import {
  canStaticFrictionHold,
  computeForces,
  getDriveForce,
  getGravityAlong,
  getMaxStaticFriction,
  getNormalForce,
  stepFriction,
  willStartMovingFromRest,
} from '../src/lib/tools/simulations/friction/physics';
import type {
  FrictionParams,
  MotionState,
} from '../src/lib/tools/simulations/friction/types';

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

function params(partial: Partial<FrictionParams> = {}): FrictionParams {
  return { ...FRICTION_DEFAULT_PARAMS, ...partial };
}

function rest(position = 0): MotionState {
  return { position, velocity: 0 };
}

function stepMany(
  current: FrictionParams,
  motion: MotionState,
  dt: number,
  steps: number,
) {
  let state = motion;
  let last = stepFriction(current, state, dt);
  for (let i = 0; i < steps; i += 1) {
    last = stepFriction(current, state, dt);
    state = last.motion;
  }
  return last;
}

test('horizontal F = 0: the body stays at rest', () => {
  const current = params({ mode: 'horizontal', appliedForce: 0, mass: 5, mu: 0.3 });
  const forces = computeForces(current, rest());
  assert.equal(forces.isResting, true);
  approxEqual(forces.acceleration, 0);
  approxEqual(forces.friction, 0);

  const stepped = stepMany(current, rest(), 1 / 60, 120);
  assert.equal(stepped.forces.isResting, true);
  approxEqual(stepped.motion.velocity, 0);
  approxEqual(stepped.motion.position, 0);
});

test('horizontal F < μmg: the body stays at rest', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 10 });
  const maxFriction = 0.3 * 5 * G;
  assert.ok(10 < maxFriction);
  assert.equal(canStaticFrictionHold(current), true);
  assert.equal(willStartMovingFromRest(current), false);

  const forces = computeForces(current, rest());
  assert.equal(forces.isResting, true);
  approxEqual(forces.friction, -10);
  approxEqual(forces.acceleration, 0);

  const stepped = stepMany(current, rest(), 1 / 60, 60);
  approxEqual(stepped.motion.velocity, 0);
  approxEqual(stepped.motion.position, 0);
});

test('horizontal F = μmg: the body is at the motion threshold and remains at rest', () => {
  const mass = 5;
  const mu = 0.3;
  const appliedForce = mu * mass * G;
  const current = params({ mode: 'horizontal', mass, mu, appliedForce });

  approxEqual(appliedForce, getMaxStaticFriction(current));
  assert.equal(canStaticFrictionHold(current), true);
  assert.equal(willStartMovingFromRest(current), false);

  const forces = computeForces(current, rest());
  assert.equal(forces.isResting, true);
  approxEqual(forces.friction, -appliedForce);
  approxEqual(forces.acceleration, 0);
});

test('horizontal F > μmg: the body starts moving', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 20 });
  assert.ok(20 > 0.3 * 5 * G);
  assert.equal(willStartMovingFromRest(current), true);

  const forces = computeForces(current, rest());
  assert.equal(forces.isResting, false);
  assert.ok(forces.acceleration > 0);

  const stepped = stepFriction(current, rest(), 1 / 60);
  assert.ok(stepped.motion.velocity > 0);
  assert.ok(stepped.motion.position > 0);
});

test('after motion starts, kinetic friction equals μmg', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const expectedFriction = 0.3 * 5 * G;
  const moving = { position: 0, velocity: 1.5 };
  const forces = computeForces(current, moving);
  approxEqual(Math.abs(forces.friction), expectedFriction);
  approxEqual(forces.friction, -expectedFriction);
});

test('acceleration matches (F - Fтр) / m while sliding', () => {
  const mass = 5;
  const mu = 0.3;
  const appliedForce = 25;
  const current = params({ mode: 'horizontal', mass, mu, appliedForce });
  const friction = mu * mass * G;
  const expectedAccel = (appliedForce - friction) / mass;
  const forces = computeForces(current, { position: 0, velocity: 0.8 });
  approxEqual(forces.acceleration, expectedAccel);
  approxEqual(forces.netForce, appliedForce - friction);
});

test('inclined without applied force: rest when tan α ≤ μ', () => {
  const mu = 0.3;
  const angleDeg = (Math.atan(mu) * 180) / Math.PI;
  const current = params({
    mode: 'inclined',
    appliedForce: 0,
    mass: 5,
    mu,
    angleDeg,
  });

  assert.equal(canStaticFrictionHold(current), true);
  assert.equal(willStartMovingFromRest(current), false);
  const forces = computeForces(current, rest());
  assert.equal(forces.isResting, true);
  approxEqual(forces.acceleration, 0);
});

test('inclined without applied force: rest when tan α < μ', () => {
  const current = params({
    mode: 'inclined',
    appliedForce: 0,
    mass: 8,
    mu: 0.4,
    angleDeg: 15,
  });
  assert.ok(Math.tan((15 * Math.PI) / 180) < 0.4);
  assert.equal(willStartMovingFromRest(current), false);
  const stepped = stepMany(current, rest(), 1 / 60, 90);
  approxEqual(stepped.motion.velocity, 0);
});

test('inclined: the body starts sliding down when tan α > μ', () => {
  const current = params({
    mode: 'inclined',
    appliedForce: 0,
    mass: 5,
    mu: 0.3,
    angleDeg: 25,
  });
  assert.ok(Math.tan((25 * Math.PI) / 180) > 0.3);
  assert.equal(willStartMovingFromRest(current), true);

  const forces = computeForces(current, rest());
  assert.equal(forces.isResting, false);
  assert.ok(forces.acceleration > 0);

  const stepped = stepFriction(current, rest(), 1 / 60);
  assert.ok(stepped.motion.velocity > 0);
});

test('inclined: N = mg cos α', () => {
  const mass = 6;
  const angleDeg = 20;
  const current = params({ mode: 'inclined', mass, angleDeg, mu: 0.25 });
  const expected = mass * G * Math.cos((angleDeg * Math.PI) / 180);
  approxEqual(getNormalForce(current), expected);
  approxEqual(computeForces(current, rest()).normal, expected);
});

test('inclined: while sliding, Fтр = μ mg cos α', () => {
  const mass = 5;
  const mu = 0.3;
  const angleDeg = 30;
  const current = params({
    mode: 'inclined',
    mass,
    mu,
    angleDeg,
    appliedForce: 0,
  });
  const expected = mu * mass * G * Math.cos((angleDeg * Math.PI) / 180);
  const forces = computeForces(current, { position: 0, velocity: 1 });
  approxEqual(Math.abs(forces.friction), expected);
});

test('changing mass changes the rest threshold and the acceleration', () => {
  const light = params({ mode: 'horizontal', mass: 2, mu: 0.3, appliedForce: 10 });
  const heavy = params({ mode: 'horizontal', mass: 10, mu: 0.3, appliedForce: 10 });

  assert.equal(willStartMovingFromRest(light), true);
  assert.equal(willStartMovingFromRest(heavy), false);

  const lightMoving = computeForces(light, { position: 0, velocity: 1 });
  const heavyMoving = computeForces(
    params({ mode: 'horizontal', mass: 10, mu: 0.3, appliedForce: 40 }),
    { position: 0, velocity: 1 },
  );
  assert.ok(lightMoving.acceleration > heavyMoving.acceleration);
  approxEqual(getMaxStaticFriction(heavy), 0.3 * 10 * G);
});

test('changing μ changes the motion threshold', () => {
  const appliedForce = 12;
  const lowMu = params({ mode: 'horizontal', mass: 5, mu: 0.1, appliedForce });
  const highMu = params({ mode: 'horizontal', mass: 5, mu: 0.8, appliedForce });

  assert.equal(willStartMovingFromRest(lowMu), true);
  assert.equal(willStartMovingFromRest(highMu), false);
  assert.ok(getMaxStaticFriction(highMu) > getMaxStaticFriction(lowMu));
});

test('changing the angle changes the along-plane gravity component', () => {
  const shallow = params({ mode: 'inclined', mass: 5, angleDeg: 10, mu: 0.5 });
  const steep = params({ mode: 'inclined', mass: 5, angleDeg: 40, mu: 0.5 });
  const expectedShallow = 5 * G * Math.sin((10 * Math.PI) / 180);
  const expectedSteep = 5 * G * Math.sin((40 * Math.PI) / 180);

  approxEqual(getGravityAlong(shallow), expectedShallow);
  approxEqual(getGravityAlong(steep), expectedSteep);
  assert.ok(getGravityAlong(steep) > getGravityAlong(shallow));
  approxEqual(getGravityAlong(params({ mode: 'horizontal', angleDeg: 40 })), 0);
});

test('μ = 0 removes friction and uses a = F/m', () => {
  const current = params({ mode: 'horizontal', mass: 4, mu: 0, appliedForce: 12 });
  const forces = computeForces(current, rest());
  approxEqual(forces.friction, 0);
  approxEqual(forces.acceleration, 12 / 4);
  assert.equal(forces.isResting, false);
});

test('horizontal plane ignores the stored incline angle', () => {
  const current = params({
    mode: 'horizontal',
    angleDeg: 45,
    mass: 5,
    mu: 0.2,
    appliedForce: 0,
  });
  approxEqual(getNormalForce(current), 5 * G);
  approxEqual(getGravityAlong(current), 0);
  approxEqual(getDriveForce(current), 0);
});

test('kinetic friction opposes the actual velocity', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0 });
  const left = computeForces(current, { position: 0, velocity: -2 });
  const right = computeForces(current, { position: 0, velocity: 2 });
  assert.ok(left.friction > 0);
  assert.ok(right.friction < 0);
  approxEqual(Math.abs(left.friction), Math.abs(right.friction));
});

test('a reversing body stops if static friction can hold', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.4, appliedForce: 0 });
  const stepped = stepFriction(current, { position: 0.2, velocity: 0.01 }, 1 / 30);
  assert.equal(stepped.forces.isResting, true);
  approxEqual(stepped.motion.velocity, 0);
  approxEqual(stepped.forces.acceleration, 0);
});

test('the block does not leave the scene bounds', () => {
  const current = params({ mode: 'horizontal', mass: 1, mu: 0, appliedForce: 80 });
  const stepped = stepMany(
    current,
    { position: FRICTION_BOUNDS.maxPosition - 0.01, velocity: 20 },
    1 / 30,
    40,
  );
  assert.ok(stepped.motion.position <= FRICTION_BOUNDS.maxPosition + 1e-9);
  assert.ok(stepped.motion.velocity >= 0);
  assert.ok(Number.isFinite(stepped.motion.position));
  assert.ok(Number.isFinite(stepped.motion.velocity));
  assert.ok(Number.isFinite(stepped.forces.acceleration));
});

test('integration does not jump velocity when breakaway happens from rest', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 20 });
  const first = stepFriction(current, rest(), 1 / 60);
  const expectedA = (20 - 0.3 * 5 * G) / 5;
  approxEqual(first.forces.acceleration, expectedA, 1e-9);
  approxEqual(first.motion.velocity, expectedA / 60, 1e-9);
  assert.ok(first.motion.velocity < 0.2);
});

if (errors.length > 0) {
  console.error('verify-friction-physics failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-friction-physics passed (${passed} tests)`);
