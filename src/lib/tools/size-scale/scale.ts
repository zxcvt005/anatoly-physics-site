import {
  LIGHT_YEAR_METERS,
  MIN_VISUAL_PX,
  type SizeScaleDimension,
  type SizeScaleObject,
  SIZE_SCALE_OBJECTS,
} from './objects';

export type ImageContentBox = {
  imageWidth: number;
  imageHeight: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export function log10Meters(meters: number): number {
  return Math.log10(meters);
}

export function metersFromLog(log: number): number {
  return 10 ** log;
}

export function scaleLogBounds(
  objects: readonly SizeScaleObject[] = SIZE_SCALE_OBJECTS,
): { min: number; max: number } {
  return {
    min: log10Meters(objects[0].sizeMeters),
    max: log10Meters(objects[objects.length - 1].sizeMeters),
  };
}

export function clampScaleLog(log: number, bounds = scaleLogBounds()): number {
  return Math.min(bounds.max, Math.max(bounds.min, log));
}

export function nearestObjectIndex(
  log: number,
  objects: readonly SizeScaleObject[] = SIZE_SCALE_OBJECTS,
): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < objects.length; index += 1) {
    const distance = Math.abs(log10Meters(objects[index].sizeMeters) - log);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }

  return best;
}

/**
 * Characteristic on-screen size from physical meters only.
 * Objects smaller than the current scale shrink with size/scale.
 * Larger objects are a preview that grows as the scale approaches them,
 * so the next object appears from the side instead of covering the stage.
 * PNG pixel size is not an input.
 */
export function visualCharacteristicPixels(
  sizeMeters: number,
  currentScaleMeters: number,
  basePx: number,
  minPx = MIN_VISUAL_PX,
): number {
  if (!(sizeMeters > 0) || !(currentScaleMeters > 0) || !(basePx > 0)) {
    return minPx;
  }

  const ratio = sizeMeters / currentScaleMeters;
  const relative = ratio <= 1 ? ratio : currentScaleMeters / sizeMeters;
  return Math.max(minPx, relative * basePx);
}

export function contentCharacteristicPixels(
  box: ImageContentBox,
  dimension: SizeScaleDimension,
): number {
  if (dimension === 'height') {
    return box.height;
  }

  if (dimension === 'length') {
    return box.width;
  }

  return Math.max(box.width, box.height);
}

export function imageDrawSize(
  box: ImageContentBox,
  characteristicPx: number,
  dimension: SizeScaleDimension,
): { width: number; height: number } {
  const contentPx = Math.max(1, contentCharacteristicPixels(box, dimension));
  const scale = characteristicPx / contentPx;

  return {
    width: box.imageWidth * scale,
    height: box.imageHeight * scale,
  };
}

export function objectScreenX(
  objectLog: number,
  currentLog: number,
  stageWidth: number,
  pixelsPerDecade: number,
): number {
  return stageWidth / 2 + (objectLog - currentLog) * pixelsPerDecade;
}

export function visibleObjectIndexes(
  log: number,
  objects: readonly SizeScaleObject[] = SIZE_SCALE_OBJECTS,
  span = 3.5,
): number[] {
  const indexes: number[] = [];

  for (let index = 0; index < objects.length; index += 1) {
    const distance = Math.abs(log10Meters(objects[index].sizeMeters) - log);
    if (distance <= span) {
      indexes.push(index);
    }
  }

  if (indexes.length === 0) {
    indexes.push(nearestObjectIndex(log, objects));
  }

  return indexes;
}

const NICE_MANTISSAS = [1, 2, 5];

export function nearestNiceLength(meters: number): number {
  if (!(meters > 0)) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(meters));
  let best = meters;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let shift = -1; shift <= 1; shift += 1) {
    for (const mantissa of NICE_MANTISSAS) {
      const candidate = mantissa * 10 ** (exponent + shift);
      const score = Math.abs(Math.log10(candidate) - Math.log10(meters));
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }

  return best;
}

function formatFixed(value: number, decimals: number): string {
  const text = value.toFixed(decimals);
  const [whole, fraction = ''] = text.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return trimmed ? `${whole},${trimmed}` : whole;
}

function formatSig(value: number, digits = 3): string {
  if (value === 0) {
    return '0';
  }

  const abs = Math.abs(value);
  const exponent = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, digits - exponent - 1);
  return formatFixed(abs, decimals);
}

function groupInteger(value: number): string {
  const rounded = Math.round(value);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function lightYearLabel(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1) {
    return 'св. года';
  }

  const rounded = Math.round(abs);
  const mod10 = rounded % 10;
  const mod100 = rounded % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'св. год';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'св. года';
  }

  return 'св. лет';
}

export function formatSizeMeters(meters: number): string {
  if (!(meters > 0) || !Number.isFinite(meters)) {
    return '—';
  }

  if (meters >= LIGHT_YEAR_METERS * 0.5) {
    const lightYears = meters / LIGHT_YEAR_METERS;

    if (lightYears >= 1e9) {
      return `${formatSig(lightYears / 1e9)} млрд св. лет`;
    }

    if (lightYears >= 1e6) {
      return `${formatSig(lightYears / 1e6)} млн св. лет`;
    }

    const text =
      lightYears >= 10000 ? groupInteger(lightYears) : formatSig(lightYears);
    return `${text} ${lightYearLabel(lightYears)}`;
  }

  if (meters >= 1000) {
    const kilometers = meters / 1000;

    if (kilometers >= 1e9) {
      return `${formatSig(kilometers / 1e9)} млрд км`;
    }

    if (kilometers >= 1e6) {
      return `${formatSig(kilometers / 1e6)} млн км`;
    }

    if (kilometers >= 1e5) {
      return `${formatSig(kilometers / 1e3)} тыс. км`;
    }

    return `${kilometers >= 10000 ? groupInteger(kilometers) : formatSig(kilometers)} км`;
  }

  if (meters >= 1) {
    return `${formatSig(meters)} м`;
  }

  if (meters >= 0.01) {
    return `${formatSig(meters * 100)} см`;
  }

  if (meters >= 0.001) {
    return `${formatSig(meters * 1000)} мм`;
  }

  if (meters >= 1e-6) {
    return `${formatSig(meters * 1e6)} мкм`;
  }

  if (meters >= 1e-9) {
    return `${formatSig(meters * 1e9)} нм`;
  }

  if (meters >= 1e-12) {
    return `${formatSig(meters * 1e12)} пм`;
  }

  return `${formatSig(meters * 1e15)} фм`;
}

export function formatRulerLength(meters: number): string {
  if (meters >= LIGHT_YEAR_METERS * 0.5) {
    const niceLightYears = nearestNiceLength(meters / LIGHT_YEAR_METERS);
    return formatSizeMeters(niceLightYears * LIGHT_YEAR_METERS);
  }

  return formatSizeMeters(nearestNiceLength(meters));
}
