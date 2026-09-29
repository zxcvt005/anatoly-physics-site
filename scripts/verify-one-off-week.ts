import assert from 'node:assert/strict';
import {
  buildOneOffByWeekday,
  buildWeekdayGridItems,
  getOneOffLessonsForWeekday,
  isInCurrentMoscowWeek,
} from '../src/lib/one-off-week';
import type { Lesson, WeeklyScheduleSlot } from '../src/types/tutor';

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

function oneOff(overrides: Partial<Lesson> & Pick<Lesson, 'id' | 'date'>): Lesson {
  return {
    studentId: 's1',
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: 'extra',
    isOutsideSchedule: true,
    makeupStatus: 'none',
    ...overrides,
  };
}

function slot(
  overrides: Partial<WeeklyScheduleSlot> &
    Pick<WeeklyScheduleSlot, 'id' | 'startTime' | 'endTime'>,
): WeeklyScheduleSlot {
  return {
    weekday: 3,
    studentIds: ['s-reg'],
    ...overrides,
  };
}

const TODAY = '2026-09-14';

test('isInCurrentMoscowWeek includes only the displayed Mon–Sun week', () => {
  assert.equal(isInCurrentMoscowWeek('2026-09-14T09:00:00+03:00', TODAY), true);
  assert.equal(isInCurrentMoscowWeek('2026-09-16T17:00:00+03:00', TODAY), true);
  assert.equal(isInCurrentMoscowWeek('2026-09-20T18:00:00+03:00', TODAY), true);
  assert.equal(isInCurrentMoscowWeek('2026-09-13T17:00:00+03:00', TODAY), false);
  assert.equal(isInCurrentMoscowWeek('2026-09-21T17:00:00+03:00', TODAY), false);
});

test('one-off is placed on its Moscow weekday, not every same weekday', () => {
  const lesson = oneOff({
    id: 'off-wed',
    date: '2026-09-16T17:00:00+03:00',
    endTime: '18:00',
  });

  const wednesday = getOneOffLessonsForWeekday([lesson], 3, TODAY);
  const monday = getOneOffLessonsForWeekday([lesson], 1, TODAY);

  assert.equal(wednesday.length, 1);
  assert.equal(wednesday[0]?.id, 'off-wed');
  assert.equal(monday.length, 0);
});

test('one-off on the same weekday next week is filtered out', () => {
  const thisWeek = oneOff({
    id: 'this-wed',
    date: '2026-09-16T17:00:00+03:00',
    endTime: '18:00',
  });
  const nextWeek = oneOff({
    id: 'next-wed',
    date: '2026-09-23T17:00:00+03:00',
    endTime: '18:00',
  });

  const map = buildOneOffByWeekday([thisWeek, nextWeek], TODAY);
  const wednesday = map.get(3) ?? [];

  assert.deepEqual(
    wednesday.map((lesson) => lesson.id),
    ['this-wed'],
  );
});

test('grid items use start/end times and sit between neighboring slots', () => {
  const lesson = oneOff({
    id: 'half',
    date: '2026-09-16T09:30:00+03:00',
    endTime: '11:00',
  });
  const morning = slot({ id: 'slot-9', startTime: '09:00', endTime: '10:00' });
  const noon = slot({ id: 'slot-12', startTime: '12:00', endTime: '13:00' });

  const items = buildWeekdayGridItems([noon, morning], [lesson]);

  assert.deepEqual(
    items.map((item) => ({ kind: item.kind, id: item.id, start: item.startTime, end: item.endTime })),
    [
      { kind: 'slot', id: 'slot-9', start: '09:00', end: '10:00' },
      { kind: 'one-off', id: 'half', start: '09:30', end: '11:00' },
      { kind: 'slot', id: 'slot-12', start: '12:00', end: '13:00' },
    ],
  );
});

test('overlapping regular and one-off stay as separate items, slot first', () => {
  const lesson = oneOff({
    id: 'off-17',
    date: '2026-09-16T17:00:00+03:00',
    endTime: '18:00',
  });
  const regular = slot({ id: 'slot-17', startTime: '17:00', endTime: '18:00' });

  const items = buildWeekdayGridItems([regular], [lesson]);

  assert.equal(items.length, 2);
  assert.equal(items[0]?.kind, 'slot');
  assert.equal(items[0]?.id, 'slot-17');
  assert.equal(items[1]?.kind, 'one-off');
  assert.equal(items[1]?.id, 'off-17');
});

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log('verify-one-off-week passed');
