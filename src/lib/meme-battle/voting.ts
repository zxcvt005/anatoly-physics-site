import type { MemePlacement } from './types';

export function placementsAreValid(
  roundImageIds: readonly string[],
  placements: readonly MemePlacement[],
): boolean {
  if (roundImageIds.length !== 3 || placements.length !== 3) return false;

  const imageIds = new Set(placements.map((placement) => placement.imageId));
  if (imageIds.size !== 3) return false;
  if (!roundImageIds.every((imageId) => imageIds.has(imageId))) return false;

  const places = new Set(placements.map((placement) => placement.place));
  return places.size === 3 && [1, 2, 3].every((place) => places.has(place));
}
