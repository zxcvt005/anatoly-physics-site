export type PlaneMode = 'horizontal' | 'inclined';

export type FrictionParams = {
  mode: PlaneMode;
  mass: number;
  mu: number;
  angleDeg: number;
  appliedForce: number;
  gravity: number;
};

export type MotionState = {
  position: number;
  velocity: number;
};

export type FrictionForces = {
  alphaRad: number;
  alphaDeg: number;
  weight: number;
  gravityAlong: number;
  gravityPerp: number;
  normal: number;
  appliedForce: number;
  driveForce: number;
  maxStaticFriction: number;
  kineticFrictionMagnitude: number;
  friction: number;
  netForce: number;
  acceleration: number;
  isResting: boolean;
};

export type FrictionBounds = {
  minPosition: number;
  maxPosition: number;
};

export type FrictionStepResult = {
  motion: MotionState;
  forces: FrictionForces;
  hitBound: 'min' | 'max' | null;
};

export type FrictionSnapshot = {
  motion: MotionState;
  forces: FrictionForces;
  hitBound: 'min' | 'max' | null;
};
