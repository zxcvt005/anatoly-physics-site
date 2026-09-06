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

  const ticks: number[] = [];
  const count = Math.round((niceMax - niceMin) / step);
  for (let i = 0; i <= count; i += 1) {
    const value = niceMin + i * step;
    // Guard floating drift.
    ticks.push(Number(value.toPrecision(12)));
  }

  return {
    min: niceMin,
    max: niceMax === niceMin ? niceMin + step : niceMax,
    step,
    ticks,
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
