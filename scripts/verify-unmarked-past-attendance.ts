/**
 * Attendance for historical lessons must stay available after the lesson day.
 *
 * Example: 2026-09-05 17:00 remains markable on 2026-09-06 and 2026-09-07.
 *
 * Run: npm run verify:unmarked-past-attendance
 */
import assert from 'node:assert/strict';
import { buildCompletedLessonFromMarking } from '../src/lib/lesson-marking-apply';
import { getMaterializedLessonIdFromSlotItem } from '../src/lib/lesson-marking';
import { buildUnmarkedPastItems } from '../src/lib/assistant-marking';
import { applyTransferToLessons } from '../src/lib/lesson-transfer';
import { isLessonChargeable } from '../src/lib/lesson-utils';
import { diffSlotStudentMembership } from '../src/lib/schedule-slot-membership';
import {
  getUnmarkedLowerBoundForSlotStudent,
  isDateWithinUnmarkedPastWindow,
  timestampToMoscowDateKey,
} from '../src/lib/unmarked-past-bounds';
import type { Lesson, Student, WeeklyScheduleSlot } from '../src/types/tutor';

const LESSON_DATE = '2026-09-05';
const LESSON_TIME = '17:00';
const DAY_OF = '2026-09-05';
const NEXT_DAY = '2026-09-06';
const FEW_DAYS_LATER = '2026-09-07';

function saturdaySlot(overrides: Partial<WeeklyScheduleSlot> = {}): WeeklyScheduleSlot {
  return {
    id: 'slot-sat-1700',
    weekday: 6,
    startTime: LESSON_TIME,
    endTime: '18:00',
    studentIds: ['student-1'],
    createdAt: '2025-09-01T10:00:00+03:00',
    studentJoinedAt: { 'student-1': '2025-09-01T10:00:00+03:00' },
    ...overrides,
  };
}

function student(overrides: Partial<Student> = {}): Student {
  return {
    id: 'student-1',
    name: 'Иван Иванов',
    firstName: 'Иван',
    lastName: 'Иванов',
    gradeClass: '10',
    token: 'ivan2026',
    rate4Weeks: 16_000,
    lessonsPerWeek: 2,
    ratePerLesson: 2_000,
    createdAt: '2025-01-15T12:00:00+03:00',
    startedAt: '2025-09-01',
    ...overrides,
  };
}

function testHistoricalRegularSlotStaysVisible() {
  const slots = [saturdaySlot()];
  const students = [student()];

  for (const today of [NEXT_DAY, FEW_DAYS_LATER]) {
    const items = buildUnmarkedPastItems(slots, [], students, undefined, today);
    const match = items.find(
      (item) => item.dateKey === LESSON_DATE && item.studentId === 'student-1',
    );
    assert.ok(
      match,
      `Lesson ${LESSON_DATE} ${LESSON_TIME} must remain unmarked-past on ${today}`,
    );
    assert.equal(match?.timeLabel.includes(LESSON_TIME), true);
    assert.equal(match?.source, 'regular-slot');
  }
}

function testDayOfLessonIsTodayNotUnmarkedPast() {
  const items = buildUnmarkedPastItems(
    [saturdaySlot()],
    [],
    [student()],
    undefined,
    DAY_OF,
  );
  assert.equal(
    items.some((item) => item.dateKey === LESSON_DATE),
    false,
    'The lesson day itself belongs to today marking, not unmarked past',
  );
}

function testPastOneOffStaysVisible() {
  const oneOff: Lesson = {
    id: 'oneoff-1',
    studentId: 'student-1',
    date: `${LESSON_DATE}T${LESSON_TIME}:00+03:00`,
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: 'extra',
    isOutsideSchedule: true,
    makeupStatus: 'none',
    attendance: 'planned',
  };

  const items = buildUnmarkedPastItems(
    [],
    [oneOff],
    [student()],
    undefined,
    FEW_DAYS_LATER,
  );
  const match = items.find((item) => item.lessonId === 'oneoff-1');
  assert.ok(match, 'Past scheduled one-off must stay available after its date');
  assert.equal(match?.source, 'one-off');
  assert.equal(match?.dateKey, LESSON_DATE);
}

function testSlotEditMustNotResetJoinBoundInDiff() {
  const diffSameStudents = diffSlotStudentMembership(
    ['student-1', 'student-2'],
    ['student-1', 'student-2'],
  );
  assert.deepEqual(diffSameStudents.toAdd, []);
  assert.deepEqual(diffSameStudents.toRemove, []);

  const diffChanged = diffSlotStudentMembership(
    ['student-1', 'student-2'],
    ['student-1', 'student-3'],
  );
  assert.deepEqual(diffChanged.toAdd, ['student-3']);
  assert.deepEqual(diffChanged.toRemove, ['student-2']);
}

function testResetJoinDateWouldHideLesson() {
  const slot = saturdaySlot({
    studentJoinedAt: { 'student-1': `${FEW_DAYS_LATER}T09:00:00+03:00` },
  });
  const lowerBound = getUnmarkedLowerBoundForSlotStudent(
    slot,
    'student-1',
    student(),
    FEW_DAYS_LATER,
  );
  assert.equal(
    isDateWithinUnmarkedPastWindow(LESSON_DATE, FEW_DAYS_LATER, lowerBound),
    true,
    'Reset join dates after slot.createdAt must not hide historical unmarked lessons',
  );
}

function testPreservedJoinDateKeepsLesson() {
  const slot = saturdaySlot();
  const lowerBound = getUnmarkedLowerBoundForSlotStudent(
    slot,
    'student-1',
    student(),
    FEW_DAYS_LATER,
  );
  assert.equal(
    isDateWithinUnmarkedPastWindow(LESSON_DATE, FEW_DAYS_LATER, lowerBound),
    true,
  );
}

function testRetroMaterializedIdUsesLessonDateNotToday() {
  const id = getMaterializedLessonIdFromSlotItem({
    id: 'past-slot',
    lessonId: 'slot-slot-sat-1700-student-1',
    studentId: 'student-1',
    timeLabel: '17:00–18:00',
    dateKey: LESSON_DATE,
  });
  assert.equal(id, `mat-${LESSON_DATE}-slot-sat-1700-student-1`);
  assert.equal(id.includes(FEW_DAYS_LATER), false);
}

function testRetroAttendanceBusinessLogic() {
  const base: Lesson = {
    id: `mat-${LESSON_DATE}-slot-sat-1700-student-1`,
    studentId: 'student-1',
    date: `${LESSON_DATE}T${LESSON_TIME}:00+03:00`,
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    makeupStatus: 'none',
    attendance: 'planned',
  };

  const present = buildCompletedLessonFromMarking(base, { wasPresent: true });
  assert.equal(present.attendance, 'present');
  assert.equal(isLessonChargeable(present), true);

  const excused = buildCompletedLessonFromMarking(base, {
    wasPresent: false,
    isUnexcusedAbsence: false,
  });
  assert.equal(excused.attendance, 'absent');
  assert.equal(excused.isUnexcusedAbsence, false);
  assert.equal(isLessonChargeable(excused), false);

  const unexcused = buildCompletedLessonFromMarking(base, {
    wasPresent: false,
    isUnexcusedAbsence: true,
  });
  assert.equal(unexcused.attendance, 'absent');
  assert.equal(unexcused.isUnexcusedAbsence, true);
  assert.equal(isLessonChargeable(unexcused), true);

  const transferredLessons = applyTransferToLessons([base], base.id, {
    date: '2026-09-12',
    time: '17:00',
    endTime: '18:00',
  });
  const transferred = transferredLessons.find((lesson) => lesson.id === base.id);
  assert.equal(transferred?.attendance, 'transferred');
  assert.equal(transferred ? isLessonChargeable(transferred) : true, false);
}

function testPostgresOffsetWithoutColon() {
  assert.equal(
    timestampToMoscowDateKey('2026-09-05 14:00:00+00'),
    '2026-09-05',
  );
}

function run() {
  testHistoricalRegularSlotStaysVisible();
  testDayOfLessonIsTodayNotUnmarkedPast();
  testPastOneOffStaysVisible();
  testSlotEditMustNotResetJoinBoundInDiff();
  testResetJoinDateWouldHideLesson();
  testPreservedJoinDateKeepsLesson();
  testRetroMaterializedIdUsesLessonDateNotToday();
  testRetroAttendanceBusinessLogic();
  testPostgresOffsetWithoutColon();
  console.log('verify-unmarked-past-attendance: all checks passed');
}

run();
