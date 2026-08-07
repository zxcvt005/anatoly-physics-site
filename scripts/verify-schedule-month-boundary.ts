import assert from 'node:assert/strict';
import {
  buildStudentLessonView,
  filterLessonsForUpcomingListByMoscow,
  generateFutureLessonsFromSchedule,
} from '../src/lib/schedule-lessons';
import {
  addDaysToMoscowDateKey,
  buildMoscowCalendarCells,
  getMoscowDateKey,
} from '../src/lib/lesson-datetime';
import { isOrphanScheduledRegularLesson } from '../src/lib/lesson-orphans';
import { combineDateAndTime, normalizeLesson } from '../src/lib/lesson-utils';
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

const studentId = 'student-boundary';
const studentB = 'student-other';
const slots: WeeklyScheduleSlot[] = [
  {
    id: 'slot-mon',
    weekday: 1,
    startTime: '10:00',
    endTime: '11:00',
    studentIds: [studentId],
  },
  {
    id: 'slot-thu',
    weekday: 4,
    startTime: '14:00',
    endTime: '15:00',
    studentIds: [studentId, studentB],
  },
];

test('Moscow calendar grid for August 2026 has 31 day cells', () => {
  const cells = buildMoscowCalendarCells(2026, 7);
  const dayCells = cells.filter((cell) => cell !== null);
  assert.equal(dayCells.length, 31);
});

test('Moscow calendar grid includes first and last day of month', () => {
  const cells = buildMoscowCalendarCells(2026, 7);
  assert.ok(cells.includes(1));
  assert.ok(cells.includes(31));
});

test('addDays crosses July 31 → August 1', () => {
  assert.equal(addDaysToMoscowDateKey('2026-07-31', 1), '2026-08-01');
});

test('addDays crosses Dec 31 → Jan 1', () => {
  assert.equal(addDaysToMoscowDateKey('2026-12-31', 1), '2027-01-01');
});

test('regular slot created in July is visible in August', () => {
  const view = buildStudentLessonView(studentId, [], slots, 16, false, '2026-08-01');
  assert.ok(view.upcomingLessons.length > 0, 'expected August upcoming lessons');
  assert.ok(
    view.upcomingLessons.some((l) => getMoscowDateKey(l.date).startsWith('2026-08')),
    'expected at least one August lesson',
  );
});

test('last week of July and first week of August both generated from July 31', () => {
  const generated = generateFutureLessonsFromSchedule(
    studentId,
    slots,
    2,
    '2026-07-31',
  );
  const keys = generated.map((l) => getMoscowDateKey(l.date));
  assert.ok(keys.includes('2026-07-31') || keys.includes('2026-08-03'));
  assert.ok(keys.some((k) => k.startsWith('2026-08')));
});

test('one-off in August appears once in upcoming', () => {
  const oneOff = normalizeLesson({
    id: 'one-off-aug',
    studentId,
    date: combineDateAndTime('2026-08-05', '16:00'),
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: 'extra',
    isOutsideSchedule: true,
    makeupStatus: 'none',
    attendance: 'planned',
  });
  const view = buildStudentLessonView(
    studentId,
    [oneOff],
    slots,
    16,
    false,
    '2026-08-01',
  );
  const oneOffMatches = view.upcomingLessons.filter((l) => l.id === 'one-off-aug');
  assert.equal(oneOffMatches.length, 1);
});

test('past July completed lesson is not in upcoming', () => {
  const past = normalizeLesson({
    id: 'past-july',
    studentId,
    date: combineDateAndTime('2026-07-28', '10:00'),
    status: 'completed',
    paymentStatus: 'paid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    makeupStatus: 'none',
    attendance: 'present',
  });
  const view = buildStudentLessonView(
    studentId,
    [past],
    slots,
    16,
    false,
    '2026-08-01',
  );
  assert.ok(
    !view.upcomingLessons.some((l) => l.id === 'past-july'),
    'past lesson must not be upcoming',
  );
  assert.ok(view.pastLessons.some((l) => l.id === 'past-july'));
});

test('future August completed lesson is not duplicated as generated', () => {
  const futureCompleted = normalizeLesson({
    id: 'mat-2026-08-03-slot-mon-student-boundary',
    studentId,
    date: combineDateAndTime('2026-08-03', '10:00'),
    status: 'completed',
    paymentStatus: 'paid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    makeupStatus: 'none',
    attendance: 'present',
  });
  const view = buildStudentLessonView(
    studentId,
    [futureCompleted],
    slots,
    16,
    false,
    '2026-08-01',
  );
  const aug3 = view.upcomingLessons.filter(
    (l) => getMoscowDateKey(l.date) === '2026-08-03' && l.studentId === studentId,
  );
  assert.equal(aug3.length, 0, 'completed occurrence must not appear as generated upcoming');
});

test('student sees only own lessons', () => {
  const view = buildStudentLessonView(studentId, [], slots, 16, false, '2026-08-01');
  assert.ok(view.upcomingLessons.every((l) => l.studentId === studentId));
});

test('orphan scheduled regular must not suppress generated upcoming', () => {
  const orphan = normalizeLesson({
    id: 'orphan-scheduled',
    studentId,
    date: combineDateAndTime('2026-08-03', '10:00'),
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    makeupStatus: 'none',
    attendance: 'planned',
  });
  assert.ok(isOrphanScheduledRegularLesson(orphan));
  const view = buildStudentLessonView(
    studentId,
    [orphan],
    slots,
    16,
    false,
    '2026-08-01',
  );
  const aug3 = view.upcomingLessons.filter(
    (l) => getMoscowDateKey(l.date) === '2026-08-03',
  );
  assert.equal(
    aug3.length,
    1,
    'Aug 3 must still show generated regular when orphan scheduled regular exists in DB',
  );
  assert.ok(aug3[0]?.id.startsWith('gen-'));
});

test('future August lesson appears in 14-day upcoming list window', () => {
  const view = buildStudentLessonView(studentId, [], slots, 16, false, '2026-08-01');
  const listed = filterLessonsForUpcomingListByMoscow(
    view.upcomingLessons,
    '2026-08-01',
  );
  assert.ok(listed.length > 0);
});

test('past July lesson is excluded from upcoming list window', () => {
  const past = normalizeLesson({
    id: 'past-july-list',
    studentId,
    date: combineDateAndTime('2026-07-28', '10:00'),
    status: 'completed',
    paymentStatus: 'paid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    makeupStatus: 'none',
    attendance: 'present',
  });
  const view = buildStudentLessonView(
    studentId,
    [past],
    slots,
    16,
    false,
    '2026-08-01',
  );
  const listed = filterLessonsForUpcomingListByMoscow(
    view.upcomingLessons,
    '2026-08-01',
  );
  assert.ok(!listed.some((l) => l.id === 'past-july-list'));
});

test('regular and one-off same day do not duplicate same occurrence', () => {
  const oneOff = normalizeLesson({
    id: 'one-off-same',
    studentId,
    date: combineDateAndTime('2026-08-03', '10:00'),
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: 'extra',
    isOutsideSchedule: true,
    makeupStatus: 'none',
    attendance: 'planned',
  });
  const view = buildStudentLessonView(
    studentId,
    [oneOff],
    slots,
    16,
    false,
    '2026-08-01',
  );
  const aug3 = view.upcomingLessons.filter(
    (l) => getMoscowDateKey(l.date) === '2026-08-03',
  );
  assert.equal(aug3.length, 1);
  assert.equal(aug3[0]?.id, 'one-off-same');
});

if (errors.length > 0) {
  console.error('verify-schedule-month-boundary failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('verify-schedule-month-boundary passed');
