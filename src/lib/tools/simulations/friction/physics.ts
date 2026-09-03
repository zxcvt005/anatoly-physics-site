import {
  DEFAULT_GRAVITY,
  FORCE_BALANCE_EPSILON,
  FRICTION_BOUNDS,
  FRICTION_RANGES,
  MAX_SPEED,
  MAX_STEP_DT,
  REST_VELOCITY_THRESHOLD,
} from './constants';
import type {
  FrictionBounds,
  FrictionForces,
  FrictionParams,
  FrictionSnapshot,
  FrictionStepResult,
  MotionState,
} from './types';
import { clamp, degToRad, finiteNumber, signNonZero } from '../math';

export function sanitizeDt(dt: number): number {
  const value = finiteNumber(dt, 0);
  if (value <= 0) {
    return 0;
  }

  return Math.min(value, MAX_STEP_DT);
}

export function sanitizeParams(params: FrictionParams): FrictionParams {
  return {
    mode: params.mode === 'inclined' ? 'inclined' : 'horizontal',
    mass: clamp(finiteNumber(params.mass, 1), 1e-6, 1e6),
    mu: clamp(finiteNumber(params.mu, 0), 0, 5),
    angleDeg: clamp(finiteNumber(params.angleDeg, 0), 0, 89),
    appliedForce: clamp(finiteNumber(params.appliedForce, 0), -1e6, 1e6),
    gravity: clamp(
      finiteNumber(params.gravity, DEFAULT_GRAVITY),
      FRICTION_RANGES.gravity.min,
      FRICTION_RANGES.gravity.max,
    ),
  };
}

export function wrapPosition(
  position: number,
  bounds: FrictionBounds = FRICTION_BOUNDS,
): number {
  const span = bounds.maxPosition - bounds.minPosition;
  if (!(span > 0)) {
    return 0;
  }

  const value = finiteNumber(position, 0);
  const t = (value - bounds.minPosition) / span;
  const wrapped = t - Math.floor(t);
  return bounds.minPosition + wrapped * span;
}

export function sanitizeMotion(
  motion: MotionState,
  bounds: FrictionBounds = FRICTION_BOUNDS,
): MotionState {
  return {
    position: wrapPosition(motion.position, bounds),
    velocity: (() => {
      const value = clamp(finiteNumber(motion.velocity, 0), -MAX_SPEED, MAX_SPEED);
      return value === 0 ? 0 : value;
    })(),
  };
}

export function getAlphaRad(params: FrictionParams): number {
  if (params.mode !== 'inclined') {
    return 0;
  }

  return degToRad(params.angleDeg);
}

export function getWeight(mass: number, gravity: number = DEFAULT_GRAVITY): number {
  return mass * gravity;
}

export function getNormalForce(params: FrictionParams): number {
  return getWeight(params.mass, params.gravity) * Math.cos(getAlphaRad(params));
}

export function getGravityAlong(params: FrictionParams): number {
  return getWeight(params.mass, params.gravity) * Math.sin(getAlphaRad(params));
}

export function getDriveForce(params: FrictionParams): number {
  return params.appliedForce + getGravityAlong(params);
}

export function getMaxStaticFriction(params: FrictionParams): number {
  return params.mu * getNormalForce(params);
}

export function canStaticFrictionHold(params: FrictionParams): boolean {
  return (
    Math.abs(getDriveForce(params)) <=
    getMaxStaticFriction(params) + FORCE_BALANCE_EPSILON
  );
}

export function willStartMovingFromRest(params: FrictionParams): boolean {
  return !canStaticFrictionHold(params);
}

function isAtRest(velocity: number): boolean {
  return Math.abs(finiteNumber(velocity, 0)) <= REST_VELOCITY_THRESHOLD;
}

function motionBand(velocity: number): -1 | 0 | 1 {
  const value = finiteNumber(velocity, 0);
  if (Math.abs(value) <= REST_VELOCITY_THRESHOLD) {
    return 0;
  }

  return value < 0 ? -1 : 1;
}

function wipeSignedZero(value: number): number {
  return value === 0 ? 0 : value;
}

function heldAtRest(forces: FrictionForces): FrictionForces {
  return {
    ...forces,
    acceleration: 0,
    netForce: 0,
    isResting: true,
    friction: wipeSignedZero(finiteNumber(-forces.driveForce, 0)),
  };
}

function withFiniteForces(forces: FrictionForces): FrictionForces {
  return {
    ...forces,
    acceleration: wipeSignedZero(finiteNumber(forces.acceleration, 0)),
    netForce: wipeSignedZero(finiteNumber(forces.netForce, 0)),
    friction: wipeSignedZero(finiteNumber(forces.friction, 0)),
  };
}

function timeToRest(velocity: number, acceleration: number): number {
  if (velocity === 0 || acceleration === 0 || velocity * acceleration >= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(velocity / acceleration);
}

export function computeForces(
  params: FrictionParams,
  motion: MotionState,
): FrictionForces {
  const safeParams = sanitizeParams(params);
  const mass = safeParams.mass;
  const mu = safeParams.mu;
  const gravity = safeParams.gravity;
  const alphaRad = getAlphaRad(safeParams);
  const weight = getWeight(mass, gravity);
  const gravityAlong = weight * Math.sin(alphaRad);
  const gravityPerp = weight * Math.cos(alphaRad);
  const normal = gravityPerp;
  const appliedForce = safeParams.appliedForce;
  const driveForce = appliedForce + gravityAlong;
  const maxStaticFriction = mu * normal;
  const kineticFrictionMagnitude = maxStaticFriction;
  const velocity = finiteNumber(motion.velocity, 0);
  const resting = isAtRest(velocity);

  if (resting && Math.abs(driveForce) <= maxStaticFriction + FORCE_BALANCE_EPSILON) {
    const friction = -driveForce;
    return {
      alphaRad,
      alphaDeg: safeParams.mode === 'inclined' ? safeParams.angleDeg : 0,
      weight,
      gravityAlong,
      gravityPerp,
      normal,
      appliedForce,
      driveForce,
      maxStaticFriction,
      kineticFrictionMagnitude,
      friction,
      netForce: 0,
      acceleration: 0,
      isResting: true,
    };
  }

  const kineticSign = resting
    ? signNonZero(driveForce)
    : signNonZero(velocity);
  const friction = -kineticSign * kineticFrictionMagnitude;
  const netForce = driveForce + friction;
  const acceleration = netForce / mass;

  return {
    alphaRad,
    alphaDeg: safeParams.mode === 'inclined' ? safeParams.angleDeg : 0,
    weight,
    gravityAlong,
    gravityPerp,
    normal,
    appliedForce,
    driveForce,
    maxStaticFriction,
    kineticFrictionMagnitude,
    friction,
    netForce,
    acceleration,
    isResting: false,
  };
}

function wrapIntoBounds(
  position: number,
  bounds: FrictionBounds,
): number {
  return wrapPosition(position, bounds);
}

function resultForRest(
  position: number,
  forces: FrictionForces,
  bounds: FrictionBounds,
): FrictionStepResult {
  return {
    motion: sanitizeMotion({ position, velocity: 0 }, bounds),
    forces: withFiniteForces(heldAtRest(forces)),
    hitBound: null,
  };
}

export function stepFriction(
  params: FrictionParams,
  motion: MotionState,
  dt: number,
  bounds: FrictionBounds = FRICTION_BOUNDS,
): FrictionStepResult {
  const safeParams = sanitizeParams(params);
  const currentMotion = sanitizeMotion(motion, bounds);
  const safeDt = sanitizeDt(dt);
  const startForces = computeForces(safeParams, currentMotion);

  if (safeDt === 0) {
    const resting = startForces.isResting;
    return {
      motion: {
        position: currentMotion.position,
        velocity: resting ? 0 : currentMotion.velocity === 0 ? 0 : currentMotion.velocity,
      },
      forces: withFiniteForces(resting ? heldAtRest(startForces) : startForces),
      hitBound: null,
    };
  }

  if (startForces.isResting) {
    return resultForRest(currentMotion.position, startForces, bounds);
  }

  const startBand = motionBand(currentMotion.velocity);
  let velocity = currentMotion.velocity + startForces.acceleration * safeDt;
  const stopTime = timeToRest(currentMotion.velocity, startForces.acceleration);
  const crossedRest =
    startBand !== 0 &&
    (motionBand(velocity) !== startBand || stopTime <= safeDt);

  if (crossedRest) {
    const tStop = Number.isFinite(stopTime)
      ? clamp(stopTime, 0, safeDt)
      : motionBand(velocity) === 0
        ? safeDt
        : 0;
    const restPosition = wrapIntoBounds(
      currentMotion.position + currentMotion.velocity * tStop,
      bounds,
    );
    const restForces = computeForces(safeParams, {
      position: restPosition,
      velocity: 0,
    });

    if (restForces.isResting) {
      return resultForRest(restPosition, restForces, bounds);
    }

    const remainingDt = Math.max(0, safeDt - tStop);
    velocity = restForces.acceleration * remainingDt;
    const position = wrapIntoBounds(
      restPosition + velocity * remainingDt,
      bounds,
    );
    const nextForces = computeForces(safeParams, { position, velocity });
    const snapped = isAtRest(velocity) && nextForces.isResting;

    return {
      motion: sanitizeMotion(
        { position, velocity: snapped ? 0 : velocity },
        bounds,
      ),
      forces: withFiniteForces(snapped ? heldAtRest(nextForces) : nextForces),
      hitBound: null,
    };
  }

  velocity = clamp(finiteNumber(velocity, 0), -MAX_SPEED, MAX_SPEED);
  if (velocity === 0) {
    velocity = 0;
  }

  const position = wrapIntoBounds(
    currentMotion.position + velocity * safeDt,
    bounds,
  );
  const nextForces = computeForces(safeParams, { position, velocity });

  if (nextForces.isResting) {
    return resultForRest(position, nextForces, bounds);
  }

  return {
    motion: sanitizeMotion({ position, velocity }, bounds),
    forces: withFiniteForces(nextForces),
    hitBound: null,
  };
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return (0).toFixed(digits);
  }

  const rounded = Number(value.toFixed(digits));
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return normalized.toFixed(digits);
}

export function formatNewtons(value: number): string {
  return `${formatNumber(value, 2)} Н`;
}

export function formatMetersPerSecond(value: number): string {
  return `${formatNumber(value, 2)} м/с`;
}

export function formatAcceleration(value: number): string {
  return `${formatNumber(value, 2)} м/с²`;
}

export function formatGravity(value: number): string {
  const digits = Number.isInteger(value) ? 0 : 1;
  return `${formatNumber(value, digits)} м/с²`;
}

export function formatMass(value: number): string {
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)} кг`;
}

export function formatMu(value: number): string {
  return formatNumber(value, 2);
}

export function formatAngle(value: number): string {
  return `${Math.round(value)}°`;
}

export function createFrictionSnapshot(
  params: FrictionParams,
  motion: MotionState = { position: 0, velocity: 0 },
): FrictionSnapshot {
  return {
    motion: { ...motion },
    forces: computeForces(params, motion),
    hitBound: null,
  };
}
