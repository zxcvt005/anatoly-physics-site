import { clamp } from '@/lib/tools/simulations/math';

export function stepDecimals(step: number): number {
  if (!Number.isFinite(step) || step >= 1) {
    return 0;
  }

  const text = String(step);
  const index = text.indexOf('.');
  return index === -1 ? 1 : text.length - index - 1;
}

export function formatSimulationNumberInput(
  value: number,
  decimals: number,
): string {
  if (!Number.isFinite(value)) {
    return '';
  }

  return Number(value.toFixed(decimals)).toString();
}

/**
 * Parses a number-input draft string.
 * Empty / incomplete drafts return null so physics keeps the last valid value.
 */
export function parseSimulationNumberInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (
    trimmed === '' ||
    trimmed === '-' ||
    trimmed === '.' ||
    trimmed === '-.' ||
    trimmed === '+'
  ) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export function snapSimulationNumber(
  value: number,
  min: number,
  max: number,
  decimals: number,
): number {
  return Number(clamp(value, min, max).toFixed(decimals));
}

export function resolveSimulationNumberBlur(
  draft: string,
  lastValid: number,
  min: number,
  max: number,
  decimals: number,
): number {
  const parsed = parseSimulationNumberInput(draft);
  if (parsed === null) {
    return snapSimulationNumber(lastValid, min, max, decimals);
  }

  return snapSimulationNumber(parsed, min, max, decimals);
}
