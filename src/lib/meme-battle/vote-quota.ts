export function maxVoteRoundsForOwnImages(ownActiveImages: number): number | null {
  const count = Math.max(0, Math.floor(ownActiveImages));
  if (count <= 0) return 1;
  if (count === 1) return 2;
  if (count === 2) return 3;
  return null;
}

export function voteSlotsOccupied(input: {
  completed: number;
  hasActive: boolean;
  hasPrepared: boolean;
}): number {
  return (
    Math.max(0, input.completed) +
    (input.hasActive ? 1 : 0) +
    (input.hasPrepared ? 1 : 0)
  );
}

export function canCreateVoteRound(input: {
  ownActiveImages: number;
  completed: number;
  hasActive: boolean;
  hasPrepared: boolean;
  mode: 'current' | 'prepare';
}): boolean {
  const max = maxVoteRoundsForOwnImages(input.ownActiveImages);
  if (max == null) return true;
  if (input.mode === 'current' && input.hasActive) return true;
  if (input.mode === 'prepare' && input.hasPrepared) return true;

  const occupied = voteSlotsOccupied({
    completed: input.completed,
    hasActive: input.hasActive,
    hasPrepared: input.hasPrepared,
  });
  return occupied < max;
}

export function canActivatePreparedRound(input: {
  ownActiveImages: number;
  completed: number;
}): boolean {
  const max = maxVoteRoundsForOwnImages(input.ownActiveImages);
  if (max == null) return true;
  return input.completed < max;
}

export function voteRoundProgressLabel(input: {
  ownActiveImages: number;
  roundsCompleted: number;
  hasCurrentRound: boolean;
}): string {
  const max = maxVoteRoundsForOwnImages(input.ownActiveImages);
  if (max == null) return 'Без ограничений';
  const current = Math.min(max, input.roundsCompleted + (input.hasCurrentRound ? 1 : 0));
  return `Раунд ${Math.max(1, current)} из ${max}`;
}

export function voteLimitCopy(ownActiveImages: number): {
  title: string;
  body: string;
  cta: string;
} {
  const count = Math.max(0, Math.floor(ownActiveImages));
  if (count <= 0) {
    return {
      title: 'Хочешь ещё?',
      body: 'Ты помог оценить первые картинки. Чтобы продолжить игру, добавь свои мемы в общий банк.',
      cta: 'Добавить свои картинки →',
    };
  }
  if (count === 1) {
    return {
      title: 'Ещё один раунд доступен',
      body: 'Чтобы продолжить дальше, добавь ещё одну картинку в общий банк.',
      cta: 'Добавить картинки →',
    };
  }
  if (count === 2) {
    return {
      title: 'Пополни банк мемов',
      body: 'Ты уже оценил доступные раунды. Добавь ещё один мем — и голосование станет без ограничений.',
      cta: 'Добавить картинки →',
    };
  }
  return {
    title: 'Пополни банк мемов',
    body: 'Добавь свои картинки, чтобы открыть новые раунды.',
    cta: 'Добавить картинки →',
  };
}
