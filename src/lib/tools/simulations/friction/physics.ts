import {
  FORCE_BALANCE_EPSILON,
  FRICTION_BOUNDS,
  G,
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
import { clamp, degToRad, signNonZero } from '../math';

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
  const mass = Math.max(params.mass, 1e-9);
  const mu = Math.max(params.mu, 0);
  const alphaRad = getAlphaRad(params);
  const weight = getWeight(mass);
  const gravityAlong = weight * Math.sin(alphaRad);
  const gravityPerp = weight * Math.cos(alphaRad);
  const normal = gravityPerp;
  const appliedForce = params.appliedForce;
  const driveForce = appliedForce + gravityAlong;
  const maxStaticFriction = mu * normal;
  const kineticFrictionMagnitude = maxStaticFriction;

  const resting = isAtRest(motion.velocity);
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
      : signNonZero(motion.velocity);
    friction = -motionSign * kineticFrictionMagnitude;
    acceleration = (driveForce + friction) / mass;
    isResting = false;
  }

  return {
    alphaRad,
    alphaDeg: params.mode === 'inclined' ? params.angleDeg : 0,
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

function applyBounds(
  position: number,
  velocity: number,
  acceleration: number,
  bounds: FrictionBounds,
): {
  position: number;
  velocity: number;
  acceleration: number;
  hitBound: 'min' | 'max' | null;
} {
  let nextPosition = position;
  let nextVelocity = velocity;
  let nextAcceleration = acceleration;
  let hitBound: 'min' | 'max' | null = null;

  if (nextPosition <= bounds.minPosition) {
    nextPosition = bounds.minPosition;
    if (nextVelocity < 0) {
      nextVelocity = 0;
      nextAcceleration = 0;
      hitBound = 'min';
    }
  } else if (nextPosition >= bounds.maxPosition) {
    nextPosition = bounds.maxPosition;
    if (nextVelocity > 0) {
      nextVelocity = 0;
      nextAcceleration = 0;
      hitBound = 'max';
    }
  }

  return {
    position: nextPosition,
    velocity: nextVelocity,
    acceleration: nextAcceleration,
    hitBound,
  };
}

export function stepFriction(
  params: FrictionParams,
  motion: MotionState,
  dt: number,
  bounds: FrictionBounds = FRICTION_BOUNDS,
): FrictionStepResult {
  const safeDt = clamp(dt, 0, MAX_STEP_DT);
  let forces = computeForces(params, motion);
  const atMin = motion.position <= bounds.minPosition + 1e-12;
  const atMax = motion.position >= bounds.maxPosition - 1e-12;
  const blockedByWall =
    (atMax && forces.acceleration >= 0 && motion.velocity >= -REST_VELOCITY_THRESHOLD) ||
    (atMin && forces.acceleration <= 0 && motion.velocity <= REST_VELOCITY_THRESHOLD);

  if (safeDt === 0) {
    return {
      motion,
      forces,
      hitBound: atMin ? 'min' : atMax ? 'max' : null,
    };
  }

  if (forces.isResting || blockedByWall) {
    const bounded = applyBounds(motion.position, 0, 0, bounds);

    return {
      motion: {
        position: bounded.position,
        velocity: 0,
      },
      forces: {
        ...forces,
        acceleration: 0,
        netForce: 0,
        isResting: true,
      },
      hitBound: bounded.hitBound,
    };
  }

  let velocity = motion.velocity + forces.acceleration * safeDt;

  if (motion.velocity !== 0 && velocity * motion.velocity <= 0) {
    const restForces = computeForces(params, {
      position: motion.position,
      velocity: 0,
    });

    if (restForces.isResting) {
      const bounded = applyBounds(motion.position, 0, 0, bounds);
      return {
        motion: {
          position: bounded.position,
          velocity: 0,
        },
        forces: {
          ...restForces,
          acceleration: 0,
          netForce: 0,
          isResting: true,
        },
        hitBound: bounded.hitBound,
      };
    }

    forces = restForces;
    velocity = forces.acceleration * safeDt;
  }

  const position = motion.position + velocity * safeDt;
  const bounded = applyBounds(position, velocity, forces.acceleration, bounds);

  let nextForces = forces;
  if (bounded.hitBound) {
    nextForces = {
      ...forces,
      acceleration: 0,
      netForce: 0,
      isResting: true,
    };
  } else if (isAtRest(bounded.velocity)) {
    const restForces = computeForces(params, {
      position: bounded.position,
      velocity: 0,
    });
    nextForces = restForces.isResting
      ? { ...restForces, acceleration: 0, netForce: 0, isResting: true }
      : restForces;
  }

  return {
    motion: {
      position: bounded.position,
      velocity: bounded.hitBound ? 0 : bounded.velocity,
    },
    forces: nextForces,
    hitBound: bounded.hitBound,
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
