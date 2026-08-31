import assert from 'node:assert/strict';
import {
  calculateProbabilities,
  calculateWheelSegments,
  calculateWinnerRotation,
  formatProbability,
  getParticipantColor,
  pickWeightedWinner,
  sortParticipantsByTickets,
  spinFortuneWheel,
  type FortuneWheelParticipant,
} from '../src/lib/tools/fortune-wheel';

const errors: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    errors.push(
      `${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function participant(
  id: string,
  name: string,
  tickets: number,
  colorIndex: number,
): FortuneWheelParticipant {
  return { id, name, tickets, colorIndex };
}

function approxEqual(actual: number, expected: number, epsilon = 0.01): void {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${expected}, got ${actual}`,
  );
}

test('one participant gets 100%', () => {
  const participants = [participant('a', 'Алексей', 10, 0)];
  const probabilities = calculateProbabilities(participants);
  assert.equal(probabilities.length, 1);
  approxEqual(probabilities[0]!.probability, 100);
  assert.equal(formatProbability(probabilities[0]!.probability), '100%');
});

test('10 + 20 tickets produce 33.33 / 66.67', () => {
  const participants = [
    participant('a', 'Алексей', 10, 0),
    participant('b', 'Иван', 20, 1),
  ];
  const probabilities = calculateProbabilities(participants);
  approxEqual(probabilities[0]!.probability, 66.67);
  approxEqual(probabilities[1]!.probability, 33.33);
  assert.equal(formatProbability(probabilities[0]!.probability), '66.67%');
  assert.equal(formatProbability(probabilities[1]!.probability), '33.33%');
});

test('5 + 15 + 30 tickets produce 10 / 30 / 60', () => {
  const participants = [
    participant('a', 'Алексей', 5, 0),
    participant('b', 'Иван', 15, 1),
    participant('c', 'Мария', 30, 2),
  ];
  const probabilities = calculateProbabilities(participants);
  approxEqual(probabilities[0]!.probability, 60);
  approxEqual(probabilities[1]!.probability, 30);
  approxEqual(probabilities[2]!.probability, 10);
});

test('probabilities sum to approximately 100%', () => {
  const participants = [
    participant('a', 'A', 1, 0),
    participant('b', 'B', 1, 1),
    participant('c', 'C', 98, 2),
  ];
  const sum = calculateProbabilities(participants).reduce(
    (total, item) => total + item.probability,
    0,
  );
  approxEqual(sum, 100);
});

test('wheel segment angles match probability', () => {
  const participants = [
    participant('a', 'A', 50, 0),
    participant('b', 'B', 30, 1),
    participant('c', 'C', 20, 2),
  ];
  const segments = calculateWheelSegments(participants);
  approxEqual(segments[0]!.endAngle - segments[0]!.startAngle, 180);
  approxEqual(segments[1]!.endAngle - segments[1]!.startAngle, 108);
  approxEqual(segments[2]!.endAngle - segments[2]!.startAngle, 72);
  approxEqual(segments[2]!.endAngle, 360);
});

test('weighted random uses tickets as weight', () => {
  const participants = [
    participant('a', 'Алексей', 10, 0),
    participant('b', 'Иван', 20, 1),
    participant('c', 'Мария', 70, 2),
  ];

  assert.equal(pickWeightedWinner(participants, 0)?.id, 'a');
  assert.equal(pickWeightedWinner(participants, 9.999)?.id, 'a');
  assert.equal(pickWeightedWinner(participants, 10)?.id, 'b');
  assert.equal(pickWeightedWinner(participants, 29.999)?.id, 'b');
  assert.equal(pickWeightedWinner(participants, 30)?.id, 'c');
  assert.equal(pickWeightedWinner(participants, 99.999)?.id, 'c');
});

test('changing tickets changes probability', () => {
  const initial = [participant('a', 'Иван', 10, 2)];
  const updated = [participant('a', 'Иван', 100, 2)];
  const initialProbability = calculateProbabilities([
    ...initial,
    participant('b', 'Мария', 90, 1),
  ])[0]!.probability;
  const updatedProbability = calculateProbabilities([
    ...updated,
    participant('b', 'Мария', 0, 1),
  ].filter((item) => item.tickets > 0))[0]!.probability;
  assert.ok(initialProbability < updatedProbability);
});

test('changing tickets changes segment angle', () => {
  const participants = [
    participant('a', 'Иван', 10, 2),
    participant('b', 'Мария', 90, 1),
  ];
  const initialSweep =
    calculateWheelSegments(participants).find((item) => item.participantId === 'a')!
      .endAngle -
    calculateWheelSegments(participants).find((item) => item.participantId === 'a')!
      .startAngle;

  const updatedParticipants = [
    participant('a', 'Иван', 100, 2),
    participant('b', 'Мария', 0, 1),
  ].filter((item) => item.tickets > 0);
  const updatedSweep =
    calculateWheelSegments(updatedParticipants)[0]!.endAngle -
    calculateWheelSegments(updatedParticipants)[0]!.startAngle;

  assert.ok(updatedSweep > initialSweep);
});

test('participants are sorted by tickets descending', () => {
  const participants = [
    participant('a', 'Алексей', 10, 0),
    participant('b', 'Иван', 20, 1),
    participant('c', 'Мария', 70, 2),
  ];
  const sorted = sortParticipantsByTickets(participants);
  assert.deepEqual(
    sorted.map((item) => item.id),
    ['c', 'b', 'a'],
  );
});

test('removal recalculates probabilities', () => {
  const participants = [
    participant('a', 'Алексей', 10, 0),
    participant('b', 'Иван', 20, 1),
  ];
  const remaining = [participants[1]!];
  const probabilities = calculateProbabilities(remaining);
  assert.equal(probabilities.length, 1);
  approxEqual(probabilities[0]!.probability, 100);
});

test('adding recalculates probabilities', () => {
  const participants = [participant('a', 'Алексей', 10, 0)];
  const expanded = [...participants, participant('b', 'Иван', 10, 1)];
  const probabilities = calculateProbabilities(expanded);
  approxEqual(probabilities[0]!.probability, 50);
  approxEqual(probabilities[1]!.probability, 50);
});

test('colorIndex does not depend on sorting', () => {
  const participants = [
    participant('a', 'Иван', 10, 2),
    participant('b', 'Мария', 70, 5),
  ];
  const sorted = sortParticipantsByTickets(participants);
  const ivan = sorted.find((item) => item.id === 'a');
  assert.equal(ivan?.colorIndex, 2);
  assert.equal(getParticipantColor(ivan!.colorIndex), getParticipantColor(2));
});

test('1 / 1 / 98 creates correct sectors', () => {
  const participants = [
    participant('a', 'A', 1, 0),
    participant('b', 'B', 1, 1),
    participant('c', 'C', 98, 2),
  ];
  const segments = calculateWheelSegments(participants);
  approxEqual(segments[0]!.probability, 98);
  approxEqual(segments[1]!.probability, 1);
  approxEqual(segments[2]!.probability, 1);
  approxEqual(
    segments.reduce(
      (sum, segment) => sum + (segment.endAngle - segment.startAngle),
      0,
    ),
    360,
  );
});

test('no participants means no winner', () => {
  const spin = spinFortuneWheel([], 0, 0, 0.5);
  assert.equal(spin.winner, null);
  assert.equal(spin.result, null);
});

test('calculateWinnerRotation lands inside selected sector', () => {
  const participants = [
    participant('a', 'Алексей', 10, 0),
    participant('b', 'Иван', 20, 1),
    participant('c', 'Мария', 70, 2),
  ];
  const segments = calculateWheelSegments(participants);
  const targetRotation = calculateWinnerRotation(segments, 'b', 0.5, 0, 6);
  const finalMod = ((targetRotation % 360) + 360) % 360;
  const segment = segments.find((item) => item.participantId === 'b')!;
  const pointerAngle = (360 - finalMod) % 360;

  assert.ok(pointerAngle >= segment.startAngle);
  assert.ok(pointerAngle <= segment.endAngle);
});

if (errors.length > 0) {
  console.error('verify-fortune-wheel failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-fortune-wheel passed (${15} tests)`);
