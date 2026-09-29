export type MemeRankingSource = {
  id: string;
  totalVotes: number;
  totalPoints: number;
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
};

export type RankedMemeImage<T extends MemeRankingSource> = T & {
  averagePoints: number;
};

export function averageMemePoints(totalPoints: number, totalVotes: number): number {
  if (totalVotes <= 0) return 0;
  return totalPoints / totalVotes;
}

export function rankMemeImages<T extends MemeRankingSource>(images: readonly T[]): RankedMemeImage<T>[] {
  return images
    .filter((image) => image.totalVotes > 0)
    .map((image) => ({
      ...image,
      averagePoints: averageMemePoints(image.totalPoints, image.totalVotes),
    }))
    .sort((left, right) => {
      if (right.averagePoints !== left.averagePoints) {
        return right.averagePoints - left.averagePoints;
      }
      if (right.totalVotes !== left.totalVotes) {
        return right.totalVotes - left.totalVotes;
      }
      if (right.firstPlaceCount !== left.firstPlaceCount) {
        return right.firstPlaceCount - left.firstPlaceCount;
      }
      return left.id.localeCompare(right.id);
    });
}

export function pointsForPlace(place: number): number | null {
  if (place === 1) return 3;
  if (place === 2) return 2;
  if (place === 3) return 1;
  return null;
}

export const MEME_TOP_FIVE_LIMIT = 5;

export function memeTopFiveState(
  activeImageCount: number,
  rankedCount: number,
): 'too_few_images' | 'too_early' | 'ready' {
  if (activeImageCount < MEME_TOP_FIVE_LIMIT) return 'too_few_images';
  if (rankedCount <= 0) return 'too_early';
  return 'ready';
}
