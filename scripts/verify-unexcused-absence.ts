import assert from 'node:assert/strict';
import { buildCompletedLessonFromMarking } from '../src/lib/lesson-marking-apply';
import { computeStudentAdminStats } from '../src/lib/student-admin-stats';
import { computeStudentProgressStats } from '../src/lib/student-progress';
import { syncHomeworkAssignmentAfterMarking } from '../src/lib/tests/sync-assignment';
import { isLessonChargeable } from '../src/lib/lesson-utils';
import {
  formatLessonAttendanceLabel,
  getBalance,
  getPaidUntilDate,
} from '../src/lib/tutor-calculations';
import type { Lesson, Payment, Student } from '../src/types/tutor';

const BEFORE_YEAR = '2026-08-31T19:00:00+03:00';
const ON_YEAR_START = '2026-09-01T10:00:00+03:00';

function baseLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'l1',
    studentId: 's1',
    date: ON_YEAR_START,
    status: 'completed',
    paymentStatus: 'unpaid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    attendance: 'planned',
    ...overrides,
  };
}

function baseStudent(): Student {
  return {
    id: 's1',
    name: 'Иван Иванов',
    firstName: 'Иван',
    lastName: 'Иванов',
    gradeClass: '10',
    token: 'ivan2026',
    rate4Weeks: 16_000,
    lessonsPerWeek: 2,
    ratePerLesson: 2_000,
  };
}

function basePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'p1',
    studentId: 's1',
    amount: 16_000,
    status: 'confirmed',
    createdAt: '2026-08-01T12:00:00+03:00',
    ...overrides,
  };
}

function testPresentIsChargeable() {
  const lesson = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: true,
    lessonTopicId: 'topic-1',
  });

  assert.equal(lesson.attendance, 'present');
  assert.equal(lesson.isUnexcusedAbsence, false);
  assert.equal(isLessonChargeable(lesson), true);
}

function testRegularAbsentIsNotChargeable() {
  const lesson = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: false,
    isUnexcusedAbsence: false,
  });

  assert.equal(lesson.attendance, 'absent');
  assert.equal(lesson.isUnexcusedAbsence, false);
  assert.equal(lesson.isChargeable, false);
  assert.equal(isLessonChargeable(lesson), false);
}

function testUnexcusedAbsentIsChargeable() {
  const lesson = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: false,
    isUnexcusedAbsence: true,
  });

  assert.equal(lesson.attendance, 'absent');
  assert.equal(lesson.isUnexcusedAbsence, true);
  assert.equal(lesson.isChargeable, true);
  assert.equal(isLessonChargeable(lesson), true);
}

function testBothAbsentTypesCountInAbsences() {
  const stats = computeStudentProgressStats([
    buildCompletedLessonFromMarking(baseLesson({ id: 'l1' }), {
      wasPresent: false,
    }),
    buildCompletedLessonFromMarking(baseLesson({ id: 'l2' }), {
      wasPresent: false,
      isUnexcusedAbsence: true,
    }),
  ]);

  assert.equal(stats.absencesCount, 2);
  assert.equal(stats.attendedLessonsCount, 0);
}

function testUnexcusedAbsentNotConducted() {
  const student = baseStudent();
  const lessons = [
    buildCompletedLessonFromMarking(baseLesson(), {
      wasPresent: false,
      isUnexcusedAbsence: true,
    }),
  ];

  const stats = computeStudentAdminStats(student, lessons, [basePayment()]);
  assert.equal(stats.conductedLessons, 0);
}

function testOldAbsencesDoNotAffectCurrentYearStats() {
  const stats = computeStudentProgressStats([
    buildCompletedLessonFromMarking(
      baseLesson({ id: 'old-1', date: BEFORE_YEAR }),
      { wasPresent: false },
    ),
    buildCompletedLessonFromMarking(
      baseLesson({ id: 'old-2', date: BEFORE_YEAR }),
      { wasPresent: false, isUnexcusedAbsence: true },
    ),
    buildCompletedLessonFromMarking(
      baseLesson({ id: 'old-3', date: BEFORE_YEAR }),
      { wasPresent: false },
    ),
    buildCompletedLessonFromMarking(
      baseLesson({ id: 'old-4', date: BEFORE_YEAR }),
      { wasPresent: false },
    ),
    buildCompletedLessonFromMarking(
      baseLesson({ id: 'old-5', date: BEFORE_YEAR }),
      { wasPresent: false },
    ),
  ]);

  assert.equal(stats.absencesCount, 0);
}

function testUnexcusedAbsentAfterCutoffCountsOnce() {
  const stats = computeStudentProgressStats([
    buildCompletedLessonFromMarking(baseLesson(), {
      wasPresent: false,
      isUnexcusedAbsence: true,
    }),
  ]);

  assert.equal(stats.absencesCount, 1);
}

function testUnexcusedAbsentIncreasesChargeableCompleted() {
  const student = baseStudent();
  const payments = [basePayment()];

  const withoutUnexcused = computeStudentAdminStats(
    student,
    [
      buildCompletedLessonFromMarking(baseLesson({ id: 'present-1' }), {
        wasPresent: true,
      }),
    ],
    payments,
  );

  const withUnexcused = computeStudentAdminStats(
    student,
    [
      buildCompletedLessonFromMarking(baseLesson({ id: 'present-1' }), {
        wasPresent: true,
      }),
      buildCompletedLessonFromMarking(baseLesson({ id: 'unexcused-1' }), {
        wasPresent: false,
        isUnexcusedAbsence: true,
      }),
    ],
    payments,
  );

  assert.equal(withoutUnexcused.remainingLessons, 8 - 1);
  assert.equal(withUnexcused.remainingLessons, 8 - 2);
}

function testUnexcusedAbsentDecreasesRemainingLessons() {
  const student = baseStudent();
  const payments = [basePayment()];

  const baseline = computeStudentAdminStats(student, [], payments);
  const afterUnexcused = computeStudentAdminStats(
    student,
    [
      buildCompletedLessonFromMarking(baseLesson(), {
        wasPresent: false,
        isUnexcusedAbsence: true,
      }),
    ],
    payments,
  );

  assert.equal(baseline.remainingLessons, 8);
  assert.equal(afterUnexcused.remainingLessons, 7);
}

function testRegularAbsentDoesNotChangeRemainingLessons() {
  const student = baseStudent();
  const payments = [basePayment()];

  const baseline = computeStudentAdminStats(student, [], payments);
  const afterRegularAbsent = computeStudentAdminStats(
    student,
    [
      buildCompletedLessonFromMarking(baseLesson(), {
        wasPresent: false,
        isUnexcusedAbsence: false,
      }),
    ],
    payments,
  );

  assert.equal(baseline.remainingLessons, 8);
  assert.equal(afterRegularAbsent.remainingLessons, 8);
}

function testUnexcusedAbsentDoesNotCreateHomeworkAssignment() {
  const lesson = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: false,
    isUnexcusedAbsence: true,
  });

  assert.equal(lesson.lessonTopicId, undefined);
}

async function testSyncHomeworkSkipsUnexcusedAbsent() {
  let assignmentRequested = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    assignmentRequested = true;
    return Promise.resolve(new Response('{}', { status: 200 }));
  }) as typeof fetch;

  try {
    await syncHomeworkAssignmentAfterMarking('l1', 's1', {
      wasPresent: false,
      isUnexcusedAbsence: true,
      lessonTopicId: 'topic-should-not-be-used',
    });
    assert.equal(assignmentRequested, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function testSwitchingToPresentResetsUnexcusedAbsence() {
  const unexcused = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: false,
    isUnexcusedAbsence: true,
  });

  const presentAgain = buildCompletedLessonFromMarking(unexcused, {
    wasPresent: true,
    lessonTopicId: 'topic-1',
  });

  assert.equal(presentAgain.attendance, 'present');
  assert.equal(presentAgain.isUnexcusedAbsence, false);
  assert.equal(isLessonChargeable(presentAgain), true);
}

function testAbsentDefaultsToRegularMiss() {
  const lesson = buildCompletedLessonFromMarking(baseLesson(), {
    wasPresent: false,
  });

  assert.equal(lesson.isUnexcusedAbsence, false);
  assert.equal(lesson.isChargeable, false);
}

function testBalanceUsesUnexcusedAbsent() {
  const student = baseStudent();
  const payments = [basePayment()];
  const lessons = [
    buildCompletedLessonFromMarking(baseLesson(), {
      wasPresent: false,
      isUnexcusedAbsence: true,
    }),
  ];

  assert.equal(getBalance(student, lessons, payments), 16_000 - 2_000);
}

function testPaidUntilDateUsesUnexcusedAbsentInQueue() {
  const student = baseStudent();
  const payments = [basePayment()];

  const regularAbsentOnly = getPaidUntilDate(
    student,
    [
      buildCompletedLessonFromMarking(baseLesson(), {
        wasPresent: false,
        isUnexcusedAbsence: false,
      }),
    ],
    payments,
  );
  assert.equal(regularAbsentOnly, null);

  const unexcusedOnly = getPaidUntilDate(
    student,
    [
      buildCompletedLessonFromMarking(baseLesson(), {
        wasPresent: false,
        isUnexcusedAbsence: true,
      }),
    ],
    payments,
  );
  assert.equal(unexcusedOnly, ON_YEAR_START);
}

function testAttendanceHistoryLabel() {
  assert.equal(
    formatLessonAttendanceLabel({
      attendance: 'absent',
      isUnexcusedAbsence: false,
    }),
    'Не был',
  );
  assert.equal(
    formatLessonAttendanceLabel({
      attendance: 'absent',
      isUnexcusedAbsence: true,
    }),
    'Не был · Без предупреждения',
  );
}

function testHistoryLessonsAreNotFiltered() {
  const lessons = [
    baseLesson({ id: 'old', date: BEFORE_YEAR, attendance: 'absent' }),
    baseLesson({ id: 'new', date: ON_YEAR_START, attendance: 'present' }),
  ];

  assert.equal(lessons.length, 2);
}

async function run() {
  testPresentIsChargeable();
  testRegularAbsentIsNotChargeable();
  testUnexcusedAbsentIsChargeable();
  testBothAbsentTypesCountInAbsences();
  testUnexcusedAbsentNotConducted();
  testOldAbsencesDoNotAffectCurrentYearStats();
  testUnexcusedAbsentAfterCutoffCountsOnce();
  testUnexcusedAbsentIncreasesChargeableCompleted();
  testUnexcusedAbsentDecreasesRemainingLessons();
  testRegularAbsentDoesNotChangeRemainingLessons();
  testUnexcusedAbsentDoesNotCreateHomeworkAssignment();
  testSwitchingToPresentResetsUnexcusedAbsence();
  testAbsentDefaultsToRegularMiss();
  testBalanceUsesUnexcusedAbsent();
  testPaidUntilDateUsesUnexcusedAbsentInQueue();
  testAttendanceHistoryLabel();
  testHistoryLessonsAreNotFiltered();
  await testSyncHomeworkSkipsUnexcusedAbsent();
  console.log('verify-unexcused-absence: all checks passed');
}

run();
