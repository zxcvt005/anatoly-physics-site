import assert from 'node:assert/strict';
import {
  findNextUpcomingScheduleOccurrence,
  sortStudentIdsByUpcomingSchedule,
} from '../src/lib/tests/grades-schedule-sort';
import {
  buildStudentGradesCard,
  sortStudentGradesCards,
} from '../src/lib/tests/crm-grades';
import type { WeeklyScheduleSlot } from '../src/types/tutor';

function slot(
  partial: Pick<WeeklyScheduleSlot, 'id' | 'weekday' | 'startTime' | 'endTime' | 'studentIds'>,
): WeeklyScheduleSlot {
  return { ...partial };
}

/**
 * Monday 2026-09-07 schedule:
 * 10–11: ivanov, petrov, sidorov
 * 12–13: alexeeva, ivanov
 * 14–15: smirnov
 * Tuesday 10–11: petrov, kuznetsov
 */
function exampleSlots(): WeeklyScheduleSlot[] {
  return [
    slot({
      id: 'mon-1',
      weekday: 1,
      startTime: '10:00',
      endTime: '11:00',
      studentIds: ['ivanov', 'petrov', 'sidorov'],
    }),
    slot({
      id: 'mon-2',
      weekday: 1,
      startTime: '12:00',
      endTime: '13:00',
      studentIds: ['alexeeva', 'ivanov'],
    }),
    slot({
      id: 'mon-3',
      weekday: 1,
      startTime: '14:00',
      endTime: '15:00',
      studentIds: ['smirnov'],
    }),
    slot({
      id: 'tue-1',
      weekday: 2,
      startTime: '10:00',
      endTime: '11:00',
      studentIds: ['petrov', 'kuznetsov'],
    }),
  ];
}

function testBeforeFirstSlotPreservesInSlotOrder() {
  // Monday 09:00 Moscow = 06:00 UTC
  const now = new Date('2026-09-07T06:00:00.000Z');
  const ordered = sortStudentIdsByUpcomingSchedule(
    ['kuznetsov', 'smirnov', 'alexeeva', 'sidorov', 'petrov', 'ivanov', 'orphan'],
    exampleSlots(),
    now,
  );

  assert.deepEqual(ordered, [
    'ivanov',
    'petrov',
    'sidorov',
    'alexeeva',
    'smirnov',
    'kuznetsov',
    'orphan',
  ]);
}

function testStudentAppearsOnceWhileFirstSlotActive() {
  const now = new Date('2026-09-07T06:00:00.000Z');
  const occurrence = findNextUpcomingScheduleOccurrence(
    'ivanov',
    exampleSlots(),
    now,
  );
  assert.equal(occurrence?.startTime, '10:00');
  assert.equal(occurrence?.studentIndexInSlot, 0);

  const ordered = sortStudentIdsByUpcomingSchedule(
    ['ivanov', 'alexeeva'],
    exampleSlots(),
    now,
  );
  // Ivanov from slot1, not duplicated via slot2
  assert.deepEqual(ordered, ['ivanov', 'alexeeva']);
}

function testAfterFirstSlotMovesToNextSameDaySlot() {
  // Monday 11:30 Moscow = 08:30 UTC — slot1 ended, slot2 not started
  const now = new Date('2026-09-07T08:30:00.000Z');

  const ivanov = findNextUpcomingScheduleOccurrence(
    'ivanov',
    exampleSlots(),
    now,
  );
  assert.equal(ivanov?.startTime, '12:00');
  assert.equal(ivanov?.studentIndexInSlot, 1);

  const ordered = sortStudentIdsByUpcomingSchedule(
    ['kuznetsov', 'smirnov', 'alexeeva', 'sidorov', 'petrov', 'ivanov'],
    exampleSlots(),
    now,
  );

  // slot2: alexeeva, ivanov → slot3: smirnov → Tue: petrov, kuznetsov → sidorov none
  assert.deepEqual(ordered, [
    'alexeeva',
    'ivanov',
    'smirnov',
    'petrov',
    'kuznetsov',
    'sidorov',
  ]);
}

function testAfterAllTodaySlotsMovesToNextDay() {
  // Monday 16:00 Moscow = 13:00 UTC
  const now = new Date('2026-09-07T13:00:00.000Z');

  const ordered = sortStudentIdsByUpcomingSchedule(
    ['ivanov', 'petrov', 'sidorov', 'alexeeva', 'smirnov', 'kuznetsov'],
    exampleSlots(),
    now,
  );

  assert.deepEqual(ordered, [
    'petrov',
    'kuznetsov',
    'ivanov',
    'sidorov',
    'alexeeva',
    'smirnov',
  ]);

  // Next Monday for weekday-1-only students — lookahead covers it
  const ivanov = findNextUpcomingScheduleOccurrence(
    'ivanov',
    exampleSlots(),
    now,
  );
  assert.equal(ivanov?.dateKey, '2026-09-14');
  assert.equal(ivanov?.startTime, '10:00');
}

function testDuringSlotStillUsesThatSlot() {
  // Monday 10:30 Moscow = 07:30 UTC — inside slot1
  const now = new Date('2026-09-07T07:30:00.000Z');
  const occurrence = findNextUpcomingScheduleOccurrence(
    'ivanov',
    exampleSlots(),
    now,
  );
  assert.equal(occurrence?.startTime, '10:00');
}

function testSameSlotOrderIsScheduleOrderNotName() {
  const now = new Date('2026-09-07T06:00:00.000Z');
  const ordered = sortStudentIdsByUpcomingSchedule(
    ['sidorov', 'ivanov', 'petrov'],
    exampleSlots(),
    now,
  );
  assert.deepEqual(ordered, ['ivanov', 'petrov', 'sidorov']);
}

function testStudentWithoutFutureGoesLastStable() {
  const now = new Date('2026-09-07T06:00:00.000Z');
  const ordered = sortStudentIdsByUpcomingSchedule(
    ['orphan-b', 'ivanov', 'orphan-a'],
    exampleSlots(),
    now,
  );
  assert.deepEqual(ordered, ['ivanov', 'orphan-b', 'orphan-a']);
}

function testGradesCardsScheduleSort() {
  const now = new Date('2026-09-07T06:00:00.000Z');
  const cards = ['kuznetsov', 'alexeeva', 'ivanov', 'petrov'].map((id) =>
    buildStudentGradesCard({
      studentId: id,
      studentName: id,
      completed: [],
    }),
  );

  const sorted = sortStudentGradesCards(cards, 'schedule', {
    slots: exampleSlots(),
    now,
  });

  assert.deepEqual(
    sorted.map((card) => card.studentId),
    ['ivanov', 'petrov', 'alexeeva', 'kuznetsov'],
  );
}

function testTwoOccurrencesSameDayPicksFirstThenSecond() {
  const slots = exampleSlots();
  const before = findNextUpcomingScheduleOccurrence(
    'ivanov',
    slots,
    new Date('2026-09-07T06:00:00.000Z'),
  );
  const afterFirst = findNextUpcomingScheduleOccurrence(
    'ivanov',
    slots,
    new Date('2026-09-07T08:30:00.000Z'),
  );
  const afterSecond = findNextUpcomingScheduleOccurrence(
    'ivanov',
    slots,
    new Date('2026-09-07T10:30:00.000Z'),
  );

  assert.equal(before?.startTime, '10:00');
  assert.equal(afterFirst?.startTime, '12:00');
  assert.equal(afterSecond?.dateKey, '2026-09-14');
  assert.equal(afterSecond?.startTime, '10:00');
}

testBeforeFirstSlotPreservesInSlotOrder();
testStudentAppearsOnceWhileFirstSlotActive();
testAfterFirstSlotMovesToNextSameDaySlot();
testAfterAllTodaySlotsMovesToNextDay();
testDuringSlotStillUsesThatSlot();
testSameSlotOrderIsScheduleOrderNotName();
testStudentWithoutFutureGoesLastStable();
testGradesCardsScheduleSort();
testTwoOccurrencesSameDayPicksFirstThenSecond();

console.log('verify-grades-schedule-sort: all checks passed');
