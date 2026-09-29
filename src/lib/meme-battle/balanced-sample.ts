export type MemeCandidate = {
  id: string;
  participationCount: number;
};

export function imageSetKey(ids: readonly string[]): string {
  return [...ids].sort().join('|');
}

export function eligibleMemeCandidates(
  images: readonly (MemeCandidate & { studentId: string })[],
  studentId: string,
  votedImageIds: ReadonlySet<string>,
): MemeCandidate[] {
  return images
    .filter((image) => image.studentId !== studentId && !votedImageIds.has(image.id))
    .map((image) => ({
      id: image.id,
      participationCount: image.participationCount,
    }));
}

function combinationCount(size: number): number {
  if (size < 3) return 0;
  return (size * (size - 1) * (size - 2)) / 6;
}

export function poolHasUnseenTriple(ids: readonly string[], seenSetKeys: ReadonlySet<string>): boolean {
  const combos = combinationCount(ids.length);
  if (combos === 0) return false;

  const idSet = new Set(ids);
  let relevant = 0;
  for (const key of seenSetKeys) {
    const parts = key.split('|');
    if (parts.length === 3 && parts.every((part) => idSet.has(part))) {
      relevant += 1;
    }
  }

  return combos > relevant;
}

function allTriples(ids: readonly string[]): string[][] {
  const triples: string[][] = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      for (let k = j + 1; k < ids.length; k += 1) {
        const first = ids[i];
        const second = ids[j];
        const third = ids[k];
        if (first && second && third) {
          triples.push([first, second, third]);
        }
      }
    }
  }
  return triples;
}

function randomUnseenTriple(
  ids: readonly string[],
  seenSetKeys: ReadonlySet<string>,
  random: () => number,
): string[] | null {
  if (!poolHasUnseenTriple(ids, seenSetKeys)) return null;

  if (ids.length <= 20) {
    const fresh = allTriples(ids).filter((triple) => !seenSetKeys.has(imageSetKey(triple)));
    if (fresh.length === 0) return null;
    const index = Math.min(fresh.length - 1, Math.floor(random() * fresh.length));
    return fresh[index] ?? null;
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const pool = [...ids];
    const picked: string[] = [];
    while (picked.length < 3 && pool.length > 0) {
      const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
      const [id] = pool.splice(index, 1);
      if (id) picked.push(id);
    }
    if (picked.length === 3 && !seenSetKeys.has(imageSetKey(picked))) {
      return picked;
    }
  }

  return null;
}

/**
 * Берёт тройку из самой узкой группы с минимальным (или ближайшим) participation_count.
 * Внутри группы выбор случайный, уже виденные комбинации пропускаются.
 */
export function selectBalancedTriple(
  candidates: readonly MemeCandidate[],
  seenSetKeys: ReadonlySet<string>,
  random: () => number = Math.random,
): string[] | null {
  if (candidates.length < 3) return null;

  const min = Math.min(...candidates.map((candidate) => candidate.participationCount));
  const max = Math.max(...candidates.map((candidate) => candidate.participationCount));

  for (let slack = 0; slack <= max - min; slack += 1) {
    const pool = candidates
      .filter((candidate) => candidate.participationCount <= min + slack)
      .map((candidate) => candidate.id);
    const triple = randomUnseenTriple(pool, seenSetKeys, random);
    if (triple) return triple;
  }

  return null;
}
