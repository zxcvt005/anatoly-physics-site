export type KinematicsParams = {
  x0: number;
  v0: number;
  a: number;
  /** Research duration T in seconds (not temperature). */
  duration: number;
};

export type KinematicsSample = {
  t: number;
  x: number;
  v: number;
};

export type KinematicsLiveState = {
  time: number;
  x: number;
  v: number;
};

export type NiceScale = {
  min: number;
  max: number;
  step: number;
  ticks: number[];
};
