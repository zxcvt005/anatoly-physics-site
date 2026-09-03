import assert from 'node:assert/strict';
import {
  DEFAULT_GRAVITY,
  FRICTION_BOUNDS,
  FRICTION_DEFAULT_PARAMS,
  INITIAL_MOTION,
  MAX_STEP_DT,
  REST_VELOCITY_THRESHOLD,
} from '../src/lib/tools/simulations/friction/constants';
import {
  canStaticFrictionHold,
  computeForces,
  getDriveForce,
  getGravityAlong,
  getMaxStaticFriction,
  getNormalForce,
  sanitizeDt,
  sanitizeMotion,
  sanitizeParams,
  stepFriction,
  willStartMovingFromRest,
  wrapPosition,
} from '../src/lib/tools/simulations/friction/physics';
import { massToVisualScale } from '../src/lib/tools/simulations/friction/visual';
import { createSimulationClock } from '../src/lib/tools/simulations/simulation-clock';
import { wrapRange } from '../src/lib/tools/simulations/math';
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
  const maxFriction = 0.3 * 5 * DEFAULT_GRAVITY;
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
  const appliedForce = mu * mass * DEFAULT_GRAVITY;
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
  assert.ok(20 > 0.3 * 5 * DEFAULT_GRAVITY);
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
  const expectedFriction = 0.3 * 5 * DEFAULT_GRAVITY;
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
  const friction = mu * mass * DEFAULT_GRAVITY;
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
  const expected = mass * DEFAULT_GRAVITY * Math.cos((angleDeg * Math.PI) / 180);
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
  const expected = mu * mass * DEFAULT_GRAVITY * Math.cos((angleDeg * Math.PI) / 180);
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
  approxEqual(getMaxStaticFriction(heavy), 0.3 * 10 * DEFAULT_GRAVITY);
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
  const expectedShallow = 5 * DEFAULT_GRAVITY * Math.sin((10 * Math.PI) / 180);
  const expectedSteep = 5 * DEFAULT_GRAVITY * Math.sin((40 * Math.PI) / 180);

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
  approxEqual(getNormalForce(current), 5 * DEFAULT_GRAVITY);
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

test('long runs stay finite and do not freeze after wrapping', () => {
  const current = params({ mode: 'horizontal', mass: 1, mu: 0, appliedForce: 80 });
  const stepped = stepMany(current, rest(), 1 / 30, 400);
  assert.ok(Number.isFinite(stepped.motion.position));
  assert.ok(Number.isFinite(stepped.motion.velocity));
  assert.ok(stepped.motion.velocity > 0);
  assert.ok(stepped.motion.position <= FRICTION_BOUNDS.maxPosition + 1e-9);
  assert.ok(stepped.motion.position >= FRICTION_BOUNDS.minPosition - 1e-9);
});

test('integration does not jump velocity when breakaway happens from rest', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 20 });
  const first = stepFriction(current, rest(), 1 / 60);
  const expectedA = (20 - 0.3 * 5 * DEFAULT_GRAVITY) / 5;
  approxEqual(first.forces.acceleration, expectedA, 1e-9);
  approxEqual(first.motion.velocity, expectedA / 60, 1e-9);
  assert.ok(first.motion.velocity < 0.2);
});

test('reset-like restart after a long run starts moving again', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const afterRun = stepMany(moving, rest(), 1 / 60, 400);
  assert.ok(afterRun.motion.velocity > 1);

  const resetMotion = { position: 0, velocity: 0 };
  const idle = stepFriction(params({ appliedForce: 0 }), resetMotion, 1 / 60);
  assert.equal(idle.forces.isResting, true);
  approxEqual(idle.motion.velocity, 0);

  const again = stepFriction(moving, resetMotion, 1 / 60);
  assert.equal(again.forces.isResting, false);
  assert.ok(again.motion.velocity > 0);
});

test('huge dt is capped to one integration step', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const huge = stepFriction(current, rest(), 8);
  const capped = stepFriction(current, rest(), MAX_STEP_DT);
  approxEqual(huge.motion.velocity, capped.motion.velocity);
  approxEqual(huge.motion.position, capped.motion.position);
  approxEqual(sanitizeDt(8), MAX_STEP_DT);
  approxEqual(sanitizeDt(Number.NaN), 0);
});

test('NaN and Infinity do not poison later steps', () => {
  const poisoned = stepFriction(
    params({
      mass: Number.NaN,
      mu: Number.POSITIVE_INFINITY,
      appliedForce: Number.NaN,
    }),
    { position: Number.NaN, velocity: Number.POSITIVE_INFINITY },
    Number.NaN,
  );
  assert.ok(Number.isFinite(poisoned.motion.position));
  assert.ok(Number.isFinite(poisoned.motion.velocity));
  assert.ok(Number.isFinite(poisoned.forces.acceleration));

  const recovered = stepFriction(
    params({ appliedForce: 25 }),
    sanitizeMotion(poisoned.motion),
    1 / 60,
  );
  assert.ok(Number.isFinite(recovered.motion.velocity));
  assert.equal(recovered.forces.isResting, false);
});

test('switching plane mode after motion stays restartable', () => {
  const horizontal = params({ mode: 'horizontal', appliedForce: 25 });
  const moving = stepMany(horizontal, rest(), 1 / 60, 120);
  const inclined = params({
    mode: 'inclined',
    appliedForce: 0,
    angleDeg: 25,
    mu: 0.3,
  });
  const switched = stepFriction(inclined, moving.motion, 1 / 60);
  assert.ok(Number.isFinite(switched.motion.position));
  assert.ok(Number.isFinite(switched.motion.velocity));
  assert.ok(Number.isFinite(switched.forces.normal));

  const backToRest = stepFriction(
    params({ appliedForce: 0 }),
    { position: 0, velocity: 0 },
    1 / 60,
  );
  assert.equal(backToRest.forces.isResting, true);
});

test('20 start-move-reset cycles stay restartable', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const idle = params({ appliedForce: 0 });

  for (let cycle = 0; cycle < 20; cycle += 1) {
    const afterMove = stepMany(moving, { ...INITIAL_MOTION }, 1 / 60, 45);
    assert.equal(afterMove.forces.isResting, false);
    assert.ok(afterMove.motion.velocity > 0);

    const afterReset = stepFriction(idle, { ...INITIAL_MOTION }, 1 / 60);
    assert.equal(afterReset.forces.isResting, true);
    approxEqual(afterReset.motion.position, 0);
    approxEqual(afterReset.motion.velocity, 0);

    const startedAgain = stepFriction(moving, { ...INITIAL_MOTION }, 1 / 60);
    assert.equal(startedAgain.forces.isResting, false);
    assert.ok(startedAgain.motion.velocity > 0);
  }
});

test('20 pause-resume cycles keep velocity and then continue', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  let motion = stepMany(current, rest(), 1 / 60, 30).motion;
  assert.ok(motion.velocity > 0);

  for (let cycle = 0; cycle < 20; cycle += 1) {
    const paused = stepFriction(current, motion, 0);
    approxEqual(paused.motion.velocity, motion.velocity);
    approxEqual(paused.motion.position, motion.position);

    const resumed = stepFriction(current, paused.motion, 1 / 60);
    assert.ok(resumed.motion.velocity > paused.motion.velocity);
    assert.ok(Number.isFinite(resumed.forces.acceleration));
    motion = resumed.motion;
  }
});

test('repeated parameter changes during motion stay finite', () => {
  let motion = rest();
  const variants: FrictionParams[] = [
    params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 }),
    params({ mode: 'horizontal', mass: 8, mu: 0.1, appliedForce: 40 }),
    params({ mode: 'inclined', mass: 4, mu: 0.2, angleDeg: 18, appliedForce: 10 }),
    params({ mode: 'inclined', mass: 12, mu: 0.45, angleDeg: 35, appliedForce: 0 }),
    params({ mode: 'horizontal', mass: 2, mu: 0.05, appliedForce: 15 }),
    params({ mode: 'inclined', mass: 6, mu: 0.3, angleDeg: 12, appliedForce: 30 }),
  ];

  for (let i = 0; i < 60; i += 1) {
    const current = variants[i % variants.length];
    const stepped = stepFriction(current, motion, 1 / 60);
    assert.ok(Number.isFinite(stepped.motion.position));
    assert.ok(Number.isFinite(stepped.motion.velocity));
    assert.ok(Number.isFinite(stepped.forces.acceleration));
    assert.ok(Number.isFinite(stepped.forces.normal));
    motion = stepped.motion;
  }
});

test('right wrap continues motion without zeroing velocity', () => {
  const current = params({ mode: 'horizontal', mass: 1, mu: 0, appliedForce: 40 });
  const before = stepFriction(
    current,
    { position: FRICTION_BOUNDS.maxPosition - 0.05, velocity: 80 },
    1 / 30,
  );
  assert.ok(before.motion.position < FRICTION_BOUNDS.maxPosition);
  assert.ok(before.motion.position >= FRICTION_BOUNDS.minPosition);
  assert.ok(before.motion.velocity > 70);
  assert.equal(before.hitBound, null);

  const after = stepFriction(current, before.motion, 1 / 30);
  assert.ok(after.motion.velocity > 70);
  assert.ok(Number.isFinite(after.motion.position));
});

test('left wrap continues motion without zeroing velocity', () => {
  const current = params({ mode: 'horizontal', mass: 1, mu: 0, appliedForce: -40 });
  const before = stepFriction(
    current,
    { position: FRICTION_BOUNDS.minPosition + 0.05, velocity: -80 },
    1 / 30,
  );
  assert.ok(before.motion.position > FRICTION_BOUNDS.minPosition);
  assert.ok(before.motion.position <= FRICTION_BOUNDS.maxPosition);
  assert.ok(before.motion.velocity < -70);

  const after = stepFriction(current, before.motion, 1 / 30);
  assert.ok(after.motion.velocity < -70);
  assert.ok(wrapPosition(after.motion.position) >= FRICTION_BOUNDS.minPosition);
});

test('hatch offset stays continuous across a physics wrap', () => {
  const ppm = 125;
  const spacing = 36;
  let offset = 0;
  let previousScroll = wrapRange(offset, spacing);
  let maxJump = 0;

  const current = params({ mode: 'horizontal', mass: 1, mu: 0, appliedForce: 80 });
  let motion = { position: FRICTION_BOUNDS.maxPosition - 2, velocity: 90 };
  for (let i = 0; i < 40; i += 1) {
    const stepped = stepFriction(current, motion, 1 / 30);
    offset += -stepped.motion.velocity * ppm * (1 / 30);
    const scroll = wrapRange(offset, spacing);
    const jump = Math.min(
      Math.abs(scroll - previousScroll),
      spacing - Math.abs(scroll - previousScroll),
    );
    maxJump = Math.max(maxJump, jump);
    previousScroll = scroll;
    motion = stepped.motion;
  }

  assert.ok(maxJump < spacing * 0.75, `hatch jumped by ${maxJump}`);
});

test('in-flight integration after reset epoch is discarded', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  let epoch = 0;
  let motion = stepMany(moving, rest(), 1 / 60, 80).motion;
  assert.ok(motion.velocity > 1);

  const captured = epoch;
  const inFlight = stepFriction(moving, motion, 1 / 60);
  epoch += 1;
  motion = { ...INITIAL_MOTION };

  if (captured === epoch) {
    motion = inFlight.motion;
  }

  approxEqual(motion.position, 0);
  approxEqual(motion.velocity, 0);

  const restarted = stepFriction(moving, motion, 1 / 60);
  assert.ok(restarted.motion.velocity > 0);
  assert.ok(restarted.motion.velocity < inFlight.motion.velocity);
});

test('sanitizeParams replaces NaN and Infinity for mass, mu, force, angle and g', () => {
  const safe = sanitizeParams({
    mode: 'inclined',
    mass: Number.NaN,
    mu: Number.POSITIVE_INFINITY,
    angleDeg: Number.NEGATIVE_INFINITY,
    appliedForce: Number.NaN,
    gravity: Number.NaN,
  });
  assert.ok(Number.isFinite(safe.mass));
  assert.ok(Number.isFinite(safe.mu));
  assert.ok(Number.isFinite(safe.angleDeg));
  assert.ok(Number.isFinite(safe.appliedForce));
  assert.ok(safe.mass > 0);
  assert.equal(safe.mu, 0);
  assert.equal(safe.angleDeg, 0);
  assert.equal(safe.appliedForce, 0);
  assert.equal(safe.gravity, DEFAULT_GRAVITY);

  const forces = computeForces(safe, {
    position: Number.NaN,
    velocity: Number.NEGATIVE_INFINITY,
  });
  assert.ok(Number.isFinite(forces.acceleration));
  assert.ok(Number.isFinite(forces.normal));
  assert.ok(Number.isFinite(forces.friction));
});

test('g = 10: N = 50 N, Fтр = 15 N, a = 2 m/s²', () => {
  const current = params({
    mode: 'horizontal',
    mass: 5,
    mu: 0.3,
    appliedForce: 25,
    gravity: 10,
  });
  const forces = computeForces(current, rest());
  approxEqual(forces.normal, 50);
  approxEqual(Math.abs(forces.friction), 15);
  approxEqual(forces.netForce, 10);
  approxEqual(forces.acceleration, 2);
  assert.equal(forces.isResting, false);
});

test('changing g changes the normal force', () => {
  const base = { mode: 'horizontal' as const, mass: 5, mu: 0.3, appliedForce: 0 };
  const low = computeForces(params({ ...base, gravity: 5 }), rest());
  const high = computeForces(params({ ...base, gravity: 20 }), rest());
  approxEqual(low.normal, 25);
  approxEqual(high.normal, 100);
  assert.ok(high.normal > low.normal);
});

test('changing g changes the motion threshold', () => {
  const force = 14;
  const atDefault = params({
    mode: 'horizontal',
    mass: 5,
    mu: 0.3,
    appliedForce: force,
    gravity: 10,
  });
  const atLowG = params({
    mode: 'horizontal',
    mass: 5,
    mu: 0.3,
    appliedForce: force,
    gravity: 5,
  });
  assert.equal(willStartMovingFromRest(atDefault), false);
  assert.equal(willStartMovingFromRest(atLowG), true);
});

test('inclined N = mg cos α uses the current g', () => {
  const mass = 5;
  const gravity = 12;
  const angleDeg = 30;
  const current = params({
    mode: 'inclined',
    mass,
    gravity,
    angleDeg,
    mu: 0.3,
    appliedForce: 0,
  });
  const expected = mass * gravity * Math.cos((angleDeg * Math.PI) / 180);
  approxEqual(getNormalForce(current), expected);
  approxEqual(computeForces(current, rest()).normal, expected);
});

test('changing g changes acceleration while sliding', () => {
  const moving = { position: 0, velocity: 1 };
  const a10 = computeForces(
    params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25, gravity: 10 }),
    moving,
  ).acceleration;
  const a20 = computeForces(
    params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25, gravity: 20 }),
    moving,
  ).acceleration;
  approxEqual(a10, 2);
  approxEqual(a20, (25 - 0.3 * 5 * 20) / 5);
  assert.ok(a20 < a10);
});

test('reset defaults restore g = 10', () => {
  assert.equal(FRICTION_DEFAULT_PARAMS.gravity, 10);
  const changed = params({ gravity: 16, appliedForce: 40 });
  assert.equal(changed.gravity, 16);
  const restored = { ...FRICTION_DEFAULT_PARAMS };
  assert.equal(restored.gravity, 10);
  const afterReset = stepFriction(restored, rest(), 1 / 60);
  assert.equal(afterReset.forces.isResting, true);
  approxEqual(afterReset.forces.normal, 50);
});

test('visual block scale stays within 0.85–1.15 and grows with mass', () => {
  approxEqual(massToVisualScale(5), 1);
  assert.ok(massToVisualScale(1) >= 0.85);
  approxEqual(massToVisualScale(1), 0.85);
  approxEqual(massToVisualScale(20), 1.15);
  assert.ok(massToVisualScale(8) > massToVisualScale(5));
  assert.ok(massToVisualScale(3) < massToVisualScale(5));
});

function runUntil(
  current: FrictionParams,
  motion: MotionState,
  dt: number,
  shouldStop: (result: ReturnType<typeof stepFriction>) => boolean,
  maxSteps = 400,
) {
  let state = motion;
  let last = stepFriction(current, state, dt);
  for (let i = 0; i < maxSteps; i += 1) {
    last = stepFriction(current, state, dt);
    state = last.motion;
    if (shouldStop(last)) {
      return last;
    }
  }
  return last;
}

test('rightward motion then F = 0 stops without reversing', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const idle = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0 });
  const afterAccel = stepMany(moving, rest(), 1 / 60, 90);
  assert.ok(afterAccel.motion.velocity > 1);

  const stopped = runUntil(
    idle,
    afterAccel.motion,
    1 / 60,
    (result) => result.forces.isResting && Math.abs(result.motion.velocity) <= REST_VELOCITY_THRESHOLD,
  );

  assert.equal(stopped.forces.isResting, true);
  approxEqual(stopped.motion.velocity, 0);
  approxEqual(stopped.forces.acceleration, 0);
  approxEqual(stopped.forces.friction, 0);
  approxEqual(stopped.forces.driveForce, 0);
});

test('after a full stop with Fdrive = 0, kinetic friction is gone', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 30 });
  const idle = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0 });
  const afterAccel = stepMany(moving, rest(), 1 / 60, 80);
  const stopped = runUntil(
    idle,
    afterAccel.motion,
    1 / 60,
    (result) => result.forces.isResting,
  );

  assert.equal(stopped.forces.isResting, true);
  approxEqual(stopped.forces.friction, 0);
  approxEqual(stopped.forces.netForce, 0);

  const held = stepMany(idle, stopped.motion, 1 / 60, 45);
  assert.equal(held.forces.isResting, true);
  approxEqual(held.motion.velocity, 0);
  approxEqual(held.forces.friction, 0);
  assert.ok(held.motion.velocity >= 0);
});

test('stopping from the right never starts a reverse coast', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const idle = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0 });
  let motion = stepMany(moving, rest(), 1 / 60, 70).motion;

  for (let i = 0; i < 240; i += 1) {
    const stepped = stepFriction(idle, motion, 1 / 60);
    assert.ok(
      stepped.motion.velocity >= -REST_VELOCITY_THRESHOLD,
      `reversed at step ${i}: v=${stepped.motion.velocity}`,
    );
    motion = stepped.motion;
    if (stepped.forces.isResting) {
      approxEqual(stepped.forces.friction, 0);
      break;
    }
  }

  const after = stepMany(idle, motion, 1 / 60, 60);
  approxEqual(after.motion.velocity, 0);
  assert.equal(after.forces.isResting, true);
  approxEqual(after.forces.friction, 0);
});

test('a leftward force reverses only after static friction can no longer hold', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const weakLeft = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: -10 });
  const strongLeft = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: -25 });
  const afterAccel = stepMany(moving, rest(), 1 / 60, 80);
  assert.ok(afterAccel.motion.velocity > 1);

  const held = runUntil(weakLeft, afterAccel.motion, 1 / 60, (result) => result.forces.isResting);
  assert.equal(held.forces.isResting, true);
  approxEqual(held.motion.velocity, 0);
  approxEqual(held.forces.friction, 10);
  approxEqual(held.forces.driveForce, -10);

  const stillHeld = stepMany(weakLeft, held.motion, 1 / 60, 30);
  assert.equal(stillHeld.forces.isResting, true);
  approxEqual(stillHeld.motion.velocity, 0);

  const reversed = runUntil(
    strongLeft,
    held.motion,
    1 / 60,
    (result) => result.motion.velocity < -0.05,
  );
  assert.equal(reversed.forces.isResting, false);
  assert.ok(reversed.motion.velocity < 0);
  assert.ok(reversed.forces.friction > 0);
});

test('20 sequential start-stop cycles never reverse after rest', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const idle = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0 });
  let motion = rest();

  for (let cycle = 0; cycle < 20; cycle += 1) {
    const afterMove = stepMany(moving, motion, 1 / 60, 50);
    assert.ok(afterMove.motion.velocity > 0.3, `cycle ${cycle} did not accelerate`);

    const stopped = runUntil(
      idle,
      afterMove.motion,
      1 / 60,
      (result) => result.forces.isResting,
    );
    assert.equal(stopped.forces.isResting, true, `cycle ${cycle} did not rest`);
    approxEqual(stopped.motion.velocity, 0);
    approxEqual(stopped.forces.friction, 0);
    approxEqual(stopped.forces.acceleration, 0);
    assert.ok(
      stopped.motion.velocity >= -REST_VELOCITY_THRESHOLD,
      `cycle ${cycle} reversed: v=${stopped.motion.velocity}`,
    );

    const parked = stepMany(idle, stopped.motion, 1 / 60, 12);
    approxEqual(parked.motion.velocity, 0);
    approxEqual(parked.forces.friction, 0);
    motion = parked.motion;
  }
});

test('inclined sliding stops and stays at rest when static friction can hold', () => {
  const sliding = params({
    mode: 'inclined',
    mass: 5,
    mu: 0.15,
    angleDeg: 25,
    appliedForce: 0,
  });
  const holding = params({
    mode: 'inclined',
    mass: 5,
    mu: 0.6,
    angleDeg: 25,
    appliedForce: 0,
  });
  assert.equal(willStartMovingFromRest(sliding), true);
  assert.equal(canStaticFrictionHold(holding), true);

  const moving = stepMany(sliding, rest(), 1 / 60, 80);
  assert.ok(moving.motion.velocity > 0.2);

  const stopped = runUntil(holding, moving.motion, 1 / 60, (result) => result.forces.isResting);
  assert.equal(stopped.forces.isResting, true);
  approxEqual(stopped.motion.velocity, 0);
  approxEqual(stopped.forces.acceleration, 0);
  approxEqual(stopped.forces.friction, -stopped.forces.driveForce);

  const parked = stepMany(holding, stopped.motion, 1 / 60, 40);
  assert.equal(parked.forces.isResting, true);
  approxEqual(parked.motion.velocity, 0);
  assert.ok(parked.motion.velocity >= -REST_VELOCITY_THRESHOLD);
});

test('after a full stop the body can start moving right again', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const idle = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0 });
  const afterAccel = stepMany(moving, rest(), 1 / 60, 70);
  const stopped = runUntil(idle, afterAccel.motion, 1 / 60, (result) => result.forces.isResting);
  approxEqual(stopped.motion.velocity, 0);

  const again = stepFriction(moving, stopped.motion, 1 / 60);
  assert.equal(again.forces.isResting, false);
  assert.ok(again.motion.velocity > 0);
  assert.ok(again.forces.friction < 0);

  const continued = stepMany(moving, again.motion, 1 / 60, 20);
  assert.ok(continued.motion.velocity > again.motion.velocity);
});

test('changing μ after a full stop does not start motion while rest still holds', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const idle = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0 });
  const stopped = runUntil(
    idle,
    stepMany(moving, rest(), 1 / 60, 60).motion,
    1 / 60,
    (result) => result.forces.isResting,
  );

  const higherMu = params({ mode: 'horizontal', mass: 5, mu: 0.9, appliedForce: 0 });
  const afterMu = stepMany(higherMu, stopped.motion, 1 / 60, 40);
  assert.equal(afterMu.forces.isResting, true);
  approxEqual(afterMu.motion.velocity, 0);
  approxEqual(afterMu.forces.friction, 0);
});

test('changing g after a full stop does not start motion while rest still holds', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25, gravity: 10 });
  const idle = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0, gravity: 10 });
  const stopped = runUntil(
    idle,
    stepMany(moving, rest(), 1 / 60, 60).motion,
    1 / 60,
    (result) => result.forces.isResting,
  );

  const heavierG = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0, gravity: 20 });
  const afterG = stepMany(heavierG, stopped.motion, 1 / 60, 40);
  assert.equal(afterG.forces.isResting, true);
  approxEqual(afterG.motion.velocity, 0);
  approxEqual(afterG.forces.normal, 100);
  approxEqual(afterG.forces.friction, 0);
});

test('changing mass after a full stop does not start motion while rest still holds', () => {
  const moving = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 25 });
  const idle = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0 });
  const stopped = runUntil(
    idle,
    stepMany(moving, rest(), 1 / 60, 60).motion,
    1 / 60,
    (result) => result.forces.isResting,
  );

  const heavier = params({ mode: 'horizontal', mass: 18, mu: 0.3, appliedForce: 0 });
  const afterMass = stepMany(heavier, stopped.motion, 1 / 60, 40);
  assert.equal(afterMass.forces.isResting, true);
  approxEqual(afterMass.motion.velocity, 0);
  approxEqual(afterMass.forces.friction, 0);
});

test('a zero-crossing timestep does not keep the old kinetic friction', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: 0 });
  const dt = 0.016;
  const moving = { position: 0.4, velocity: 0.02 };
  const start = computeForces(current, moving);
  const naiveVelocity = moving.velocity + start.acceleration * dt;
  assert.ok(start.friction < 0);
  assert.ok(naiveVelocity < 0, `expected an Euler overshoot, got ${naiveVelocity}`);

  const stepped = stepFriction(current, moving, dt);
  assert.equal(stepped.forces.isResting, true);
  approxEqual(stepped.motion.velocity, 0);
  approxEqual(stepped.forces.friction, 0);
  approxEqual(stepped.forces.acceleration, 0);
  assert.ok(stepped.motion.velocity >= 0);
});

test('overshooting with leftover drive uses the current force, not the old velocity sign', () => {
  const current = params({ mode: 'horizontal', mass: 5, mu: 0.3, appliedForce: -25 });
  const dt = 0.016;
  const moving = { position: 0, velocity: 0.02 };
  const naiveVelocity = moving.velocity + computeForces(current, moving).acceleration * dt;
  assert.ok(naiveVelocity < 0);

  const stepped = stepFriction(current, moving, dt);
  assert.equal(stepped.forces.isResting, false);
  assert.ok(stepped.motion.velocity <= 0);
  assert.ok(stepped.forces.driveForce < 0);
  assert.ok(stepped.forces.friction > 0);
});

test('simulation clock starts once and ignores ticks after stop', () => {
  let frames = 0;
  let dts: number[] = [];
  let nextId = 1;
  const pending = new Map<number, (time: number) => void>();

  const clock = createSimulationClock(
    () => (dt) => {
      frames += 1;
      dts.push(dt);
    },
    {
      getMaxDt: () => 1 / 30,
      now: () => 0,
      requestFrame: (callback) => {
        const id = nextId;
        nextId += 1;
        pending.set(id, callback);
        return id;
      },
      cancelFrame: (id) => {
        pending.delete(id);
      },
    },
  );

  clock.start();
  clock.start();
  assert.equal(pending.size, 1);
  assert.equal(clock.isRunning(), true);

  const first = [...pending.values()][0];
  pending.clear();
  first(1000);
  assert.equal(frames, 1);
  approxEqual(dts[0], 1 / 30);
  assert.equal(pending.size, 1);

  clock.stop();
  assert.equal(clock.isRunning(), false);
  assert.equal(pending.size, 0);

  first(2000);
  assert.equal(frames, 1);
});

if (errors.length > 0) {
  console.error('verify-friction-physics failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-friction-physics passed (${passed} tests)`);
