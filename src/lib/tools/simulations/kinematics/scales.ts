import { DEFAULT_TARGET_TICKS, SCALE_PADDING } from './constants';
import type { NiceScale } from './types';

function niceNumber(range: number, round: boolean): number {
  if (!(range > 0) || !Number.isFinite(range)) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
}

function buildTicks(min: number, max: number, step: number): number[] {
  const ticks: number[] = [];
  const count = Math.max(1, Math.round((max - min) / step));
  for (let i = 0; i <= count; i += 1) {
    ticks.push(Number((min + i * step).toPrecision(12)));
  }
  return ticks;
}

/**
 * Build a “nice” axis scale with readable tick steps (1, 2, 5 × 10^n).
 */
export function niceScale(
  rawMin: number,
  rawMax: number,
  targetTicks = DEFAULT_TARGET_TICKS,
  padding = SCALE_PADDING,
): NiceScale {
  let min = Number.isFinite(rawMin) ? rawMin : 0;
  let max = Number.isFinite(rawMax) ? rawMax : 1;

  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1 || 1);
    min -= pad;
    max += pad;
  }

  if (min > max) {
    const swap = min;
    min = max;
    max = swap;
  }

  const span = max - min;
  const paddedMin = min - span * padding;
  const paddedMax = max + span * padding;
  const niceSpan = niceNumber(paddedMax - paddedMin, false);
  const step = niceNumber(niceSpan / Math.max(2, targetTicks - 1), true);
  const niceMin = Math.floor(paddedMin / step) * step;
  const niceMax = Math.ceil(paddedMax / step) * step;
  const finalMax = niceMax === niceMin ? niceMin + step : niceMax;

  return {
    min: niceMin,
    max: finalMax,
    step,
    ticks: buildTicks(niceMin, finalMax, step),
  };
}

/**
 * Value scale that always includes 0, with padding around data extents.
 * Used for static graph axes that must keep the origin visible.
 */
export function niceScaleIncludingZero(
  rawMin: number,
  rawMax: number,
  targetTicks = DEFAULT_TARGET_TICKS,
  padding = SCALE_PADDING,
): NiceScale {
  let min = Math.min(0, Number.isFinite(rawMin) ? rawMin : 0);
  let max = Math.max(0, Number.isFinite(rawMax) ? rawMax : 0);

  if (Math.abs(max - min) < 1e-12) {
    min = -1;
    max = 1;
  }

  const span = max - min;
  min -= span * padding;
  max += span * padding;

  // Keep zero inside after padding.
  min = Math.min(0, min);
  max = Math.max(0, max);

  const niceSpan = niceNumber(max - min, false);
  const step = niceNumber(niceSpan / Math.max(2, targetTicks - 1), true);
  let niceMin = Math.floor(min / step) * step;
  let niceMax = Math.ceil(max / step) * step;
  niceMin = Math.min(0, niceMin);
  niceMax = Math.max(0, niceMax);
  if (niceMax === niceMin) {
    niceMax = niceMin + step;
  }

  return {
    min: niceMin,
    max: niceMax,
    step,
    ticks: buildTicks(niceMin, niceMax, step),
  };
}

/**
 * Shared horizontal time axis: always starts at t = 0, never negative.
 */
export function niceTimeScale(
  duration: number,
  targetTicks = 5,
  padding = SCALE_PADDING,
): NiceScale {
  const T = Math.max(0, Number.isFinite(duration) ? duration : 0);
  if (T === 0) {
    return {
      min: 0,
      max: 1,
      step: 0.2,
      ticks: [0, 0.2, 0.4, 0.6, 0.8, 1],
    };
  }

  const padded = T * (1 + padding);
  const step = niceNumber(padded / Math.max(2, targetTicks - 1), true);
  const niceMax = Math.max(T, Math.ceil(padded / step) * step);

  return {
    min: 0,
    max: niceMax,
    step,
    ticks: buildTicks(0, niceMax, step),
  };
}

export function mapToRange(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): number {
  if (!Number.isFinite(value)) {
    return rangeMin;
  }
  const span = domainMax - domainMin;
  if (Math.abs(span) < 1e-12) {
    return (rangeMin + rangeMax) / 2;
  }
  return rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin);
}

/**
 * Map a signed value onto a plot where the zero axis sits at
 * `aboveFraction` of the plot height from the top (default 3/5).
 */
export function mapValueToAsymmetricY(
  value: number,
  scale: NiceScale,
  plotTop: number,
  plotHeight: number,
  aboveFraction: number,
): number {
  const zeroY = plotTop + plotHeight * aboveFraction;
  const plotBottom = plotTop + plotHeight;
  const max = Math.max(0, scale.max);
  const min = Math.min(0, scale.min);

  if (value >= 0) {
    if (max <= 0) {
      return zeroY;
    }
    return mapToRange(value, max, 0, plotTop, zeroY);
  }

  if (min >= 0) {
    return zeroY;
  }
  return mapToRange(value, 0, min, zeroY, plotBottom);
}
