import assert from 'node:assert/strict';
import { addOneHourToTime, isHmTimeRangeValid } from '../src/lib/crm-time-utils';
import { oneOffInputToLessonPatch } from '../src/lib/one-off-lesson';
import type { Lesson } from '../src/types/tutor';
import { combineDateAndTime } from '../src/lib/lesson-utils';

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

test('addOneHourToTime', () => {
  assert.equal(addOneHourToTime('00:00'), '01:00');
  assert.equal(addOneHourToTime('09:30'), '10:30');
  assert.equal(addOneHourToTime('16:00'), '17:00');
  assert.equal(addOneHourToTime('23:30'), '00:30');
});

test('isHmTimeRangeValid allows overnight ranges', () => {
  assert.equal(isHmTimeRangeValid('16:00', '17:00'), true);
  assert.equal(isHmTimeRangeValid('23:30', '00:30'), true);
  assert.equal(isHmTimeRangeValid('16:00', '16:00'), false);
});

test('oneOffInputToLessonPatch updates same lesson id fields', () => {
  const existing: Lesson = {
    id: 'l-test',
    studentId: 's1',
    date: '2026-07-27T16:00:00+03:00',
    endTime: '17:00',
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: 'extra',
    isOutsideSchedule: true,
    makeupStatus: 'none',
  };

  const patch = oneOffInputToLessonPatch(
    existing,
    {
      type: 'extra',
      studentId: 's2',
      date: '2026-07-28',
      time: '18:00',
      endTime: '19:00',
    },
    combineDateAndTime,
  );

  assert.equal(patch.studentId, 's2');
  assert.equal(patch.date, '2026-07-28T18:00:00+03:00');
  assert.equal(patch.endTime, '19:00');
  assert.equal(patch.transferredToLessonId, undefined);
  assert.equal(patch.transferredFromLessonId, undefined);
});

if (errors.length > 0) {
  console.error('verify-crm-time-utils failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('verify-crm-time-utils passed');
