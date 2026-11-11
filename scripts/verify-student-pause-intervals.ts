/**
 * Pause periods must not generate unmarked-past assistant items.
 *
 * Run: npm run verify:student-pause-intervals
 */
import assert from 'node:assert/strict';
import { buildUnmarkedPastItems } from '../src/lib/assistant-marking';
import { getMoscowWeekdayFromDateKey } from '../src/lib/lesson-datetime';
import {
  applyActivityStatusTransition,
  isDateInStudentPause,
} from '../src/lib/student-pause-intervals';
import type { Lesson, Student, WeeklyScheduleSlot } from '../src/types/tutor';

const STUDENT_ID = 'student-ilona';

function tuesdayFridaySlots(): WeeklyScheduleSlot[] {
  return [
    {
      id: 'slot-tue',
      weekday: 2,
      startTime: '16:00',
      endTime: '17:00',
      studentIds: [STUDENT_ID],
      createdAt: '2026-09-01T10:00:00+03:00',
      studentJoinedAt: { [STUDENT_ID]: '2026-09-01T10:00:00+03:00' },
    },
    {
      id: 'slot-fri',
      weekday: 5,
      startTime: '16:00',
      endTime: '17:00',
      studentIds: [STUDENT_ID],
      createdAt: '2026-09-01T10:00:00+03:00',
      studentJoinedAt: { [STUDENT_ID]: '2026-09-01T10:00:00+03:00' },
    },
  ];
}

function student(overrides: Partial<Student> = {}): Student {
  return {
    id: STUDENT_ID,
    name: 'Илона Меркулова',
    firstName: 'Илона',
    lastName: 'Меркулова',
    gradeClass: '10',
    token: 'ilona2026',
    rate4Weeks: 16_000,
    lessonsPerWeek: 2,
    ratePerLesson: 2_000,
    createdAt: '2026-09-14T12:00:00+03:00',
    activityStatus: 'active',
    ...overrides,
  };
}

function dateKeys(items: { dateKey: string }[]): string[] {
  return items.map((item) => item.dateKey).sort();
}

function testIntervalSemantics() {
  assert.equal(
    isDateInStudentPause('2026-11-05', [{ from: '2026-10-10', to: '2026-11-06' }]),
    true,
  );
  assert.equal(
    isDateInStudentPause('2026-11-06', [{ from: '2026-10-10', to: '2026-11-06' }]),
    false,
    'resume day is exclusive and must remain markable',
  );
  assert.equal(
    isDateInStudentPause('2026-11-10', [{ from: '2026-10-10', to: '2026-11-06' }]),
    false,
  );
}

function testSameDayPauseAndResumeCreatesEmptyInterval() {
  const opened = applyActivityStatusTransition(
    undefined,
    'active',
    'paused',
    '2026-11-06',
  );
  const closed = applyActivityStatusTransition(
    opened,
    'paused',
    'active',
    '2026-11-06',
  );
  assert.deepEqual(closed, [{ from: '2026-11-06', to: '2026-11-06' }]);
  assert.equal(isDateInStudentPause('2026-11-06', closed), false);
}

function testMultiWeekPauseThenResume() {
  const opened = applyActivityStatusTransition(
    undefined,
    'active',
    'paused',
    '2026-10-10',
  );
  const closed = applyActivityStatusTransition(
    opened,
    'paused',
    'active',
    '2026-11-06',
  );
  assert.deepEqual(closed, [{ from: '2026-10-10', to: '2026-11-06' }]);
}

function testRepeatedPause() {
  const first = applyActivityStatusTransition(
    undefined,
    'active',
    'paused',
    '2026-09-01',
  );
  const resumed = applyActivityStatusTransition(
    first,
    'paused',
    'active',
    '2026-09-10',
  );
  const second = applyActivityStatusTransition(
    resumed,
    'active',
    'paused',
    '2026-10-01',
  );
  const final = applyActivityStatusTransition(
    second,
    'paused',
    'active',
    '2026-10-20',
  );
  assert.deepEqual(final, [
    { from: '2026-09-01', to: '2026-09-10' },
    { from: '2026-10-01', to: '2026-10-20' },
  ]);
}

function testIlonaControlCase() {
  const today = '2026-11-11';
  const slots = tuesdayFridaySlots();
  const ilona = student({
    pauseIntervals: [{ from: '2026-10-10', to: '2026-11-06' }],
  });

  // Completed history before pause — mirrors production so only post-pause
  // unmarked synthetic rows remain candidates.
  const completedBeforePause: Lesson[] = [
    '2026-09-15',
    '2026-09-18',
    '2026-09-22',
    '2026-09-25',
    '2026-09-29',
    '2026-10-02',
    '2026-10-06',
    '2026-10-09',
  ].map((dateKey) => {
    const weekday = getMoscowWeekdayFromDateKey(dateKey);
    const slotId = weekday === 2 ? 'slot-tue' : 'slot-fri';
    return {
      id: `mat-${dateKey}-${slotId}-${STUDENT_ID}`,
      studentId: STUDENT_ID,
      date: `${dateKey}T13:00:00+00:00`,
      status: 'completed' as const,
      paymentStatus: 'paid' as const,
      lessonType: 'regular' as const,
      isOutsideSchedule: false,
      attendance: 'present' as const,
    } satisfies Lesson;
  });

  const withoutPause = buildUnmarkedPastItems(
    slots,
    completedBeforePause,
    [student()],
    undefined,
    today,
  ).filter((item) => item.studentId === STUDENT_ID);

  assert.equal(
    withoutPause.length,
    9,
    `expected 9 synthetic items without pause history, got ${withoutPause.length}: ${dateKeys(withoutPause).join(', ')}`,
  );

  const withPause = buildUnmarkedPastItems(
    slots,
    completedBeforePause,
    [ilona],
    undefined,
    today,
  ).filter((item) => item.studentId === STUDENT_ID);

  assert.deepEqual(dateKeys(withPause), ['2026-11-06', '2026-11-10']);
}

function testPrePauseUnmarkedStillVisible() {
  const today = '2026-11-11';
  const slots = tuesdayFridaySlots();
  const ilona = student({
    pauseIntervals: [{ from: '2026-10-10', to: '2026-11-06' }],
  });

  // Friday Oct 9 is before pause and not materialized → must stay markable.
  const items = buildUnmarkedPastItems(
    slots,
    [],
    [ilona],
    undefined,
    today,
  ).filter((item) => item.studentId === STUDENT_ID);

  assert.equal(
    items.some((item) => item.dateKey === '2026-10-09'),
    true,
    'real pre-pause schedule dates remain markable',
  );
  assert.equal(
    items.some((item) => item.dateKey === '2026-10-13'),
    false,
    'dates inside the pause interval must stay hidden',
  );
}

function testCompletedLessonsUnaffected() {
  const completed: Lesson = {
    id: 'completed-1',
    studentId: STUDENT_ID,
    date: '2026-10-09T13:00:00+00:00',
    status: 'completed',
    paymentStatus: 'paid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    attendance: 'present',
  };

  const items = buildUnmarkedPastItems(
    tuesdayFridaySlots(),
    [completed],
    [student({ pauseIntervals: [{ from: '2026-10-10', to: '2026-11-06' }] })],
    undefined,
    '2026-11-11',
  );

  assert.equal(
    items.some((item) => item.dateKey === '2026-10-09'),
    false,
    'completed lessons stay materialized and never appear as unmarked',
  );
}

function testCurrentlyPausedStudentHidden() {
  const items = buildUnmarkedPastItems(
    tuesdayFridaySlots(),
    [],
    [student({ activityStatus: 'paused', pauseIntervals: [{ from: '2026-10-10', to: null }] })],
    new Set([STUDENT_ID]),
    '2026-11-11',
  );
  assert.equal(items.filter((item) => item.studentId === STUDENT_ID).length, 0);
}

function testOneOffDuringPauseHidden() {
  const oneOff: Lesson = {
    id: 'oneoff-pause',
    studentId: STUDENT_ID,
    date: '2026-10-20T16:00:00+03:00',
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: 'extra',
    isOutsideSchedule: true,
  };

  const items = buildUnmarkedPastItems(
    [],
    [oneOff],
    [student({ pauseIntervals: [{ from: '2026-10-10', to: '2026-11-06' }] })],
    undefined,
    '2026-11-11',
  );

  assert.equal(items.length, 0);
}

function run() {
  testIntervalSemantics();
  testSameDayPauseAndResumeCreatesEmptyInterval();
  testMultiWeekPauseThenResume();
  testRepeatedPause();
  testIlonaControlCase();
  testPrePauseUnmarkedStillVisible();
  testCompletedLessonsUnaffected();
  testCurrentlyPausedStudentHidden();
  testOneOffDuringPauseHidden();
  console.log('verify-student-pause-intervals: all checks passed');
}

run();
