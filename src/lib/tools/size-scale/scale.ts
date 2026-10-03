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

/** Objects at/above this size never get an artificial minimum screen size. */
const STRICT_PROPORTION_MIN_METERS = 3.4748e6; // Moon

export type SizeScaleCamera = {
  /** World-space position in meters along the packed object chain. */
  x: number;
  /** Uniform pixels-per-meter for every object. */
  zoom: number;
};

export type ObjectWorldBounds = {
  id: string;
  index: number;
  sizeMeters: number;
  worldLeft: number;
  worldRight: number;
  worldCenter: number;
};

export function log10Meters(meters: number): number {
  return Math.log10(meters);
}

export function metersFromLog(log: number): number {
  return 10 ** log;
}

/**
 * Fixed packed horizontal chain in physical meters.
 * Each object starts exactly where the previous one ends — no gaps, no overlaps.
 * log10 is NOT used for placement.
 */
export function buildObjectWorldChain(
  objects: readonly SizeScaleObject[] = SIZE_SCALE_OBJECTS,
): ObjectWorldBounds[] {
  let cursor = 0;
  const chain: ObjectWorldBounds[] = [];

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index];
    const worldLeft = cursor;
    const worldRight = cursor + object.sizeMeters;
    chain.push({
      id: object.id,
      index,
      sizeMeters: object.sizeMeters,
      worldLeft,
      worldRight,
      worldCenter: (worldLeft + worldRight) / 2,
    });
    cursor = worldRight;
  }

  return chain;
}

export const OBJECT_WORLD_CHAIN: readonly ObjectWorldBounds[] =
  buildObjectWorldChain();

export const OBJECT_WORLD_BY_ID: ReadonlyMap<string, ObjectWorldBounds> = new Map(
  OBJECT_WORLD_CHAIN.map((entry) => [entry.id, entry]),
);

export function worldBoundsForObject(objectId: string): ObjectWorldBounds {
  const entry = OBJECT_WORLD_BY_ID.get(objectId);
  if (!entry) {
    throw new Error(`Unknown size-scale object: ${objectId}`);
  }
  return entry;
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

/** Focus size in px for an object sitting under the camera. */
export function focusSizePx(stageWidth: number, stageHeight: number): number {
  return Math.max(72, Math.min(stageHeight * 0.22, stageWidth * 0.16, 130));
}

/**
 * Map a log focus (slider) onto the packed chain.
 * Between two catalog objects, camera.x interpolates between their world centers.
 */
export function cameraXForFocusLog(
  focusLog: number,
  chain: readonly ObjectWorldBounds[] = OBJECT_WORLD_CHAIN,
  objects: readonly SizeScaleObject[] = SIZE_SCALE_OBJECTS,
): number {
  if (chain.length === 0) {
    return 0;
  }

  if (focusLog <= log10Meters(objects[0].sizeMeters)) {
    return chain[0].worldCenter;
  }

  const last = objects.length - 1;
  if (focusLog >= log10Meters(objects[last].sizeMeters)) {
    return chain[last].worldCenter;
  }

  for (let index = 0; index < last; index += 1) {
    const leftLog = log10Meters(objects[index].sizeMeters);
    const rightLog = log10Meters(objects[index + 1].sizeMeters);
    if (focusLog >= leftLog && focusLog <= rightLog) {
      const t = (focusLog - leftLog) / (rightLog - leftLog);
      return (
        chain[index].worldCenter +
        t * (chain[index + 1].worldCenter - chain[index].worldCenter)
      );
    }
  }

  return chain[last].worldCenter;
}

/**
 * Build camera from a focus scale (meters).
 * Slider/wheel still use log10 for navigation range; world placement does not.
 */
export function cameraFromFocusMeters(
  focusMeters: number,
  stageWidth: number,
  stageHeight: number,
): SizeScaleCamera {
  const safe = focusMeters > 0 ? focusMeters : 1;
  return {
    x: cameraXForFocusLog(log10Meters(safe)),
    zoom: focusSizePx(stageWidth, stageHeight) / safe,
  };
}

export function nearestObjectIndex(
  focusLog: number,
  objects: readonly SizeScaleObject[] = SIZE_SCALE_OBJECTS,
): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < objects.length; index += 1) {
    const distance = Math.abs(log10Meters(objects[index].sizeMeters) - focusLog);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }

  return best;
}

export function nearestObjectIndexByCamera(
  camera: SizeScaleCamera,
  chain: readonly ObjectWorldBounds[] = OBJECT_WORLD_CHAIN,
): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < chain.length; index += 1) {
    const entry = chain[index];
    if (camera.x >= entry.worldLeft && camera.x <= entry.worldRight) {
      return index;
    }

    const distance = Math.abs(entry.worldCenter - camera.x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }

  return best;
}

/**
 * On-screen characteristic size from physical meters and ONE shared camera zoom.
 *   pixels = sizeMeters * cameraZoom
 */
export function objectScreenSizePx(
  sizeMeters: number,
  cameraZoom: number,
  minPx = MIN_VISUAL_PX,
): number {
  if (!(sizeMeters > 0) || !(cameraZoom > 0)) {
    return minPx;
  }

  const pixels = sizeMeters * cameraZoom;

  if (sizeMeters >= STRICT_PROPORTION_MIN_METERS) {
    return pixels;
  }

  return Math.max(minPx, pixels);
}

/**
 * Project a world meter coordinate through the camera.
 * screenX = stageCenter + (worldX - cameraX) * cameraZoom
 */
export function worldToScreenX(
  worldX: number,
  cameraX: number,
  stageWidth: number,
  cameraZoom: number,
): number {
  return stageWidth / 2 + (worldX - cameraX) * cameraZoom;
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

/** Shared screen Y where every object's visible alpha bottom sits. */
export function stageBaselineY(stageHeight: number): number {
  return stageHeight * 0.82;
}

/**
 * Top-left Y of an image so its alpha-box bottom lands on baselineY.
 * Works with transform-origin 0 0 and optional extra visualScale.
 */
export function imageTopForAlphaBaseline(
  baselineY: number,
  box: ImageContentBox,
  layoutScale: number,
  visualScale = 1,
): number {
  const visibleBottomOffsetPx =
    (box.top + box.height) * layoutScale * visualScale;
  return baselineY - visibleBottomOffsetPx;
}

/**
 * Objects whose packed span may intersect the viewport.
 * Culling uses projected worldLeft/worldRight — no size-cheating gaps.
 */
export function visibleObjectIndexes(
  camera: SizeScaleCamera,
  stageWidth: number,
  _stageHeight: number,
  chain: readonly ObjectWorldBounds[] = OBJECT_WORLD_CHAIN,
  marginPx = 120,
): number[] {
  const indexes: number[] = [];
  const left = -marginPx;
  const right = stageWidth + marginPx;
  const focusIndex = nearestObjectIndexByCamera(camera, chain);

  for (let index = 0; index < chain.length; index += 1) {
    const entry = chain[index];
    const rawPx = entry.sizeMeters * camera.zoom;
    const screenLeft = worldToScreenX(entry.worldLeft, camera.x, stageWidth, camera.zoom);
    const screenRight = worldToScreenX(entry.worldRight, camera.x, stageWidth, camera.zoom);

    // Dust cull: world geometry stays exact, but sub-pixel objects far from focus
    // are not drawn with the UX minimum (would pile up as 8px noise).
    if (rawPx < 1.5 && Math.abs(index - focusIndex) > 1) {
      continue;
    }

    if (screenRight < left || screenLeft > right) {
      if (Math.abs(index - focusIndex) > 2) {
        continue;
      }
    }

    // Skip absurd GPU giants whose entire body is far past the viewport edge.
    const widthPx = screenRight - screenLeft;
    if (widthPx > stageWidth * 80 && screenLeft > stageWidth * 1.5) {
      continue;
    }

    indexes.push(index);
  }

  if (indexes.length === 0) {
    indexes.push(focusIndex);
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
