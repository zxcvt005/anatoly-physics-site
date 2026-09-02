import {
  FORCE_BALANCE_EPSILON,
  FRICTION_BOUNDS,
  G,
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
    velocity: clamp(finiteNumber(motion.velocity, 0), -MAX_SPEED, MAX_SPEED),
  };
}

export function getAlphaRad(params: FrictionParams): number {
  if (params.mode !== 'inclined') {
    return 0;
  }

  return degToRad(params.angleDeg);
}

export function getWeight(mass: number): number {
  return mass * G;
}

export function getNormalForce(params: FrictionParams): number {
  return getWeight(params.mass) * Math.cos(getAlphaRad(params));
}

export function getGravityAlong(params: FrictionParams): number {
  return getWeight(params.mass) * Math.sin(getAlphaRad(params));
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
  return Math.abs(velocity) <= REST_VELOCITY_THRESHOLD;
}

export function computeForces(
  params: FrictionParams,
  motion: MotionState,
): FrictionForces {
  const safeParams = sanitizeParams(params);
  const mass = safeParams.mass;
  const mu = safeParams.mu;
  const alphaRad = getAlphaRad(safeParams);
  const weight = getWeight(mass);
  const gravityAlong = weight * Math.sin(alphaRad);
  const gravityPerp = weight * Math.cos(alphaRad);
  const normal = gravityPerp;
  const appliedForce = safeParams.appliedForce;
  const driveForce = appliedForce + gravityAlong;
  const maxStaticFriction = mu * normal;
  const kineticFrictionMagnitude = maxStaticFriction;

  const resting = isAtRest(finiteNumber(motion.velocity, 0));
  let friction = 0;
  let acceleration = 0;
  let isResting = resting;

  if (resting && Math.abs(driveForce) <= maxStaticFriction + FORCE_BALANCE_EPSILON) {
    friction = -driveForce;
    acceleration = 0;
    isResting = true;
  } else {
    const motionSign = resting
      ? signNonZero(driveForce)
      : signNonZero(finiteNumber(motion.velocity, 0));
    friction = -motionSign * kineticFrictionMagnitude;
    acceleration = (driveForce + friction) / mass;
    isResting = false;
  }

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
    netForce: driveForce + friction,
    acceleration,
    isResting,
  };
}

function wrapIntoBounds(
  position: number,
  bounds: FrictionBounds,
): number {
  return wrapPosition(position, bounds);
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
  let forces = computeForces(safeParams, currentMotion);

  if (safeDt === 0 || forces.isResting) {
    return {
      motion: {
        position: currentMotion.position,
        velocity: forces.isResting ? 0 : currentMotion.velocity,
      },
      forces: {
        ...forces,
        acceleration: forces.isResting ? 0 : finiteNumber(forces.acceleration, 0),
        netForce: forces.isResting ? 0 : finiteNumber(forces.netForce, 0),
        isResting: forces.isResting,
      },
      hitBound: null,
    };
  }

  let velocity = currentMotion.velocity + forces.acceleration * safeDt;

  if (currentMotion.velocity !== 0 && velocity * currentMotion.velocity <= 0) {
    const restForces = computeForces(safeParams, {
      position: currentMotion.position,
      velocity: 0,
    });

    if (restForces.isResting) {
      return {
        motion: {
          position: currentMotion.position,
          velocity: 0,
        },
        forces: {
          ...restForces,
          acceleration: 0,
          netForce: 0,
          isResting: true,
        },
        hitBound: null,
      };
    }

    forces = restForces;
    velocity = forces.acceleration * safeDt;
  }

  velocity = clamp(finiteNumber(velocity, 0), -MAX_SPEED, MAX_SPEED);
  const position = wrapIntoBounds(
    currentMotion.position + velocity * safeDt,
    bounds,
  );

  let nextForces = forces;
  if (isAtRest(velocity)) {
    const restForces = computeForces(safeParams, {
      position,
      velocity: 0,
    });
    nextForces = restForces.isResting
      ? { ...restForces, acceleration: 0, netForce: 0, isResting: true }
      : restForces;
    velocity = restForces.isResting ? 0 : velocity;
  }

  return {
    motion: sanitizeMotion({ position, velocity }, bounds),
    forces: {
      ...nextForces,
      acceleration: finiteNumber(nextForces.acceleration, 0),
      netForce: finiteNumber(nextForces.netForce, 0),
      friction: finiteNumber(nextForces.friction, 0),
    },
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
