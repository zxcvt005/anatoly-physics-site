export type FortuneWheelParticipant = {
  id: string;
  name: string;
  tickets: number;
  colorIndex: number;
};

export type ParticipantWithProbability = FortuneWheelParticipant & {
  probability: number;
};

export type WheelSegment = {
  participantId: string;
  startAngle: number;
  endAngle: number;
  probability: number;
  color: string;
};

export type FortuneWheelSpinResult = {
  winnerId: string;
  winnerName: string;
  probability: number;
};

export const FORTUNE_WHEEL_COLORS = [
  '#3166F0',
  '#8B5CF6',
  '#22D3EE',
  '#34D399',
  '#F59E0B',
  '#F472B6',
  '#2DD4BF',
  '#FACC15',
  '#EF4444',
  '#6366F1',
] as const;

export const FORTUNE_WHEEL_STORAGE_KEY = 'fortune-wheel-state';

export function getParticipantColor(colorIndex: number): string {
  return FORTUNE_WHEEL_COLORS[colorIndex % FORTUNE_WHEEL_COLORS.length];
}

export function sortParticipantsByTickets(
  participants: FortuneWheelParticipant[],
): FortuneWheelParticipant[] {
  return [...participants].sort((a, b) => {
    if (b.tickets !== a.tickets) {
      return b.tickets - a.tickets;
    }
    return a.name.localeCompare(b.name, 'ru');
  });
}

export function getTotalTickets(participants: FortuneWheelParticipant[]): number {
  return participants.reduce((sum, participant) => sum + participant.tickets, 0);
}

export function formatProbability(probability: number): string {
  const rounded = Math.round(probability * 100) / 100;

  if (Number.isInteger(rounded)) {
    return `${rounded}%`;
  }

  return `${rounded.toFixed(2)}%`;
}

export function calculateProbabilities(
  participants: FortuneWheelParticipant[],
): ParticipantWithProbability[] {
  const totalTickets = getTotalTickets(participants);

  if (totalTickets === 0) {
    return participants.map((participant) => ({
      ...participant,
      probability: 0,
    }));
  }

  return sortParticipantsByTickets(participants).map((participant) => ({
    ...participant,
    probability: (participant.tickets / totalTickets) * 100,
  }));
}

export function calculateWheelSegments(
  participants: FortuneWheelParticipant[],
): WheelSegment[] {
  const totalTickets = getTotalTickets(participants);

  if (totalTickets === 0) {
    return [];
  }

  let currentAngle = 0;

  return sortParticipantsByTickets(participants).map((participant) => {
    const sweep = (participant.tickets / totalTickets) * 360;
    const segment: WheelSegment = {
      participantId: participant.id,
      startAngle: currentAngle,
      endAngle: currentAngle + sweep,
      probability: (participant.tickets / totalTickets) * 100,
      color: getParticipantColor(participant.colorIndex),
    };
    currentAngle += sweep;
    return segment;
  });
}

export function pickWeightedWinner(
  participants: FortuneWheelParticipant[],
  randomValue: number,
): FortuneWheelParticipant | null {
  if (participants.length === 0) {
    return null;
  }

  const totalTickets = getTotalTickets(participants);

  if (totalTickets <= 0) {
    return null;
  }

  const clampedRandom = Math.min(
    Math.max(randomValue, 0),
    totalTickets - Number.EPSILON,
  );

  let cumulativeTickets = 0;

  for (const participant of participants) {
    cumulativeTickets += participant.tickets;
    if (clampedRandom < cumulativeTickets) {
      return participant;
    }
  }

  return participants[participants.length - 1] ?? null;
}

export function calculateWinnerRotation(
  segments: WheelSegment[],
  winnerId: string,
  randomInSector: number,
  currentRotation: number,
  fullSpins = 6,
): number {
  const segment = segments.find((item) => item.participantId === winnerId);

  if (!segment) {
    return currentRotation;
  }

  const sectorSize = segment.endAngle - segment.startAngle;
  const clampedRandom = Math.min(Math.max(randomInSector, 0), 1);
  const targetAngle = segment.startAngle + clampedRandom * sectorSize;
  const baseRotation = (360 - targetAngle) % 360;
  const minimumRotation = currentRotation + fullSpins * 360;

  let targetRotation = minimumRotation;
  const targetMod = ((targetRotation % 360) + 360) % 360;
  const delta = (baseRotation - targetMod + 360) % 360;
  targetRotation += delta;

  if (targetRotation <= currentRotation) {
    targetRotation += 360;
  }

  return targetRotation;
}

export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleFromTopClockwise: number,
): { x: number; y: number } {
  const angleRadians = ((angleFromTopClockwise - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  };
}

export function describeWheelSectorPath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

export function createParticipantId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `participant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function spinFortuneWheel(
  participants: FortuneWheelParticipant[],
  currentRotation: number,
  randomWinner: number,
  randomInSector: number,
  fullSpins = 6,
): {
  winner: FortuneWheelParticipant | null;
  targetRotation: number;
  segments: WheelSegment[];
  result: FortuneWheelSpinResult | null;
} {
  const segments = calculateWheelSegments(participants);
  const winner = pickWeightedWinner(participants, randomWinner);

  if (!winner) {
    return {
      winner: null,
      targetRotation: currentRotation,
      segments,
      result: null,
    };
  }

  const probability =
    calculateProbabilities(participants).find((item) => item.id === winner.id)
      ?.probability ?? 0;

  return {
    winner,
    targetRotation: calculateWinnerRotation(
      segments,
      winner.id,
      randomInSector,
      currentRotation,
      fullSpins,
    ),
    segments,
    result: {
      winnerId: winner.id,
      winnerName: winner.name,
      probability,
    },
  };
}
