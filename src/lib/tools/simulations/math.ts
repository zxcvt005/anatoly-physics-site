export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function almostEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon;
}

export function signNonZero(value: number): 1 | -1 {
  return value < 0 ? -1 : 1;
}

export function finiteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function wrapRange(value: number, period: number): number {
  if (!(period > 0)) {
    return 0;
  }

  const safe = finiteNumber(value, 0);
  return safe - Math.floor(safe / period) * period;
}
