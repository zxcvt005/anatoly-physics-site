import assert from 'node:assert/strict';
import {
  ACADEMIC_YEAR_START,
  filterLessonsForAcademicStats,
  isLessonInCurrentAcademicYear,
} from '../src/lib/academic-year';
import {
  computeStudentAdminStats,
  computeStudentAdminStatuses,
} from '../src/lib/student-admin-stats';
import { computeStudentProgressStats } from '../src/lib/student-progress';
import {
  buildStudentPaymentContext,
  getPaidLessonSlots,
} from '../src/lib/lesson-payment-queue';
import {
  getBalance,
  getPaidUntilDate,
} from '../src/lib/tutor-calculations';
import type { Lesson, Payment, Student } from '../src/types/tutor';

const BEFORE_YEAR = '2026-08-31T19:00:00+03:00';
const ON_YEAR_START = '2026-09-01T10:00:00+03:00';
const AFTER_YEAR_START = '2026-09-15T10:00:00+03:00';

function baseStudent(overrides: Partial<Student> = {}): Student {
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
    ...overrides,
  };
}

function baseLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'l1',
    studentId: 's1',
    date: AFTER_YEAR_START,
    status: 'completed',
    paymentStatus: 'paid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    attendance: 'present',
    ...overrides,
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

function testAcademicYearStartConstant() {
  assert.equal(ACADEMIC_YEAR_START, '2026-09-01');
}

function testLessonBeforeCutoffExcluded() {
  assert.equal(
    isLessonInCurrentAcademicYear(baseLesson({ date: BEFORE_YEAR })),
    false,
  );
}

function testLessonOnCutoffIncluded() {
  assert.equal(
    isLessonInCurrentAcademicYear(baseLesson({ date: ON_YEAR_START })),
    true,
  );
}

function testLessonAfterCutoffIncluded() {
  assert.equal(
    isLessonInCurrentAcademicYear(baseLesson({ date: AFTER_YEAR_START })),
    true,
  );
}

function testOldConductedLessonNotInAcademicStats() {
  const lessons = [
    baseLesson({
      id: 'old',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
    baseLesson({
      id: 'new',
      date: ON_YEAR_START,
      attendance: 'present',
    }),
  ];

  const stats = computeStudentProgressStats(lessons);
  assert.equal(stats.attendedLessonsCount, 1);
}

function testOldAbsenceNotInAcademicStats() {
  const lessons = [
    baseLesson({
      id: 'old',
      date: BEFORE_YEAR,
      attendance: 'absent',
    }),
    baseLesson({
      id: 'new',
      date: ON_YEAR_START,
      attendance: 'absent',
    }),
  ];

  const stats = computeStudentProgressStats(lessons);
  assert.equal(stats.absencesCount, 1);
}

function testOldHomeworkNotInAverage() {
  const lessons = [
    baseLesson({
      id: 'old',
      date: BEFORE_YEAR,
      lessonTopicId: 'topic-old',
      homeworkPointsEarned: 10,
      homeworkPointsMax: 10,
      homeworkPercent: 100,
    }),
    baseLesson({
      id: 'new',
      date: ON_YEAR_START,
      lessonTopicId: 'topic-new',
      homeworkPointsEarned: 6,
      homeworkPointsMax: 10,
      homeworkPercent: 60,
    }),
  ];

  const stats = computeStudentProgressStats(lessons);
  assert.equal(stats.averageHomeworkPercent, 60);
}

function testOldHomeworkNotDoneNotCounted() {
  const lessons = [
    baseLesson({
      id: 'old',
      date: BEFORE_YEAR,
      lessonTopicId: 'topic-old',
    }),
    baseLesson({
      id: 'new',
      date: ON_YEAR_START,
      lessonTopicId: 'topic-new',
    }),
  ];

  const stats = computeStudentProgressStats(lessons);
  assert.equal(stats.homeworkNotDoneCount, 1);
}

function testRemainingLessonsUsesFullHistory() {
  const student = baseStudent();
  const payments = [basePayment({ amount: 16_000 })];
  const lessons = [
    baseLesson({
      id: 'old-1',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
    baseLesson({
      id: 'old-2',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
    baseLesson({
      id: 'new-1',
      date: ON_YEAR_START,
      attendance: 'present',
    }),
  ];

  const stats = computeStudentAdminStats(student, lessons, payments);
  assert.equal(stats.remainingLessons, 8 - 3);
  assert.equal(stats.conductedLessons, 1);
}

function testGetBalanceUnchangedByAcademicFilter() {
  const student = baseStudent();
  const payments = [basePayment({ amount: 16_000 })];
  const lessons = [
    baseLesson({
      id: 'old-1',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
    baseLesson({
      id: 'old-2',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
    baseLesson({
      id: 'new-1',
      date: ON_YEAR_START,
      attendance: 'present',
    }),
  ];

  const balance = getBalance(student, lessons, payments);
  assert.equal(balance, 16_000 - 3 * 2_000);
}

function testPaidUntilDateUsesFullHistory() {
  const student = baseStudent();
  const payments = [
    basePayment({ amount: 16_000 }),
    basePayment({ id: 'p2', amount: 8_000 }),
  ];
  const lessons = [
    baseLesson({
      id: 'l-old',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
    baseLesson({
      id: 'l-new',
      date: ON_YEAR_START,
      attendance: 'present',
    }),
    baseLesson({
      id: 'l-future',
      date: '2026-10-01T10:00:00+03:00',
      status: 'scheduled',
      attendance: 'planned',
      paymentStatus: 'unpaid',
    }),
  ];

  const paidUntil = getPaidUntilDate(student, lessons, payments);
  assert.equal(paidUntil, '2026-10-01T10:00:00+03:00');
}

function testPaymentContextRemainingSlotsUsesFullHistory() {
  const student = baseStudent();
  const payments = [basePayment({ amount: 16_000 })];
  const lessons = [
    baseLesson({
      id: 'old-1',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
    baseLesson({
      id: 'old-2',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
  ];

  const context = buildStudentPaymentContext(student, lessons, payments);
  assert.equal(getPaidLessonSlots(student, payments), 8);
  assert.equal(context.remainingLessonSlots, 8 - 2);
}

function testNegativeBalanceIndependentOfAcademicFilter() {
  const student = baseStudent();
  const payments = [basePayment({ amount: 4_000 })];
  const lessons = [
    baseLesson({
      id: 'old-1',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
    baseLesson({
      id: 'old-2',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
    baseLesson({
      id: 'old-3',
      date: BEFORE_YEAR,
      attendance: 'present',
    }),
  ];

  const stats = computeStudentAdminStats(student, lessons, payments);
  assert.equal(stats.remainingLessons, 2 - 3);
  assert.equal(stats.conductedLessons, 0);
  assert.equal(stats.absencesCount, 0);

  const statuses = computeStudentAdminStatuses(student, stats, payments, []);
  assert.ok(statuses.some((status) => status.id === 'negative_balance'));
  assert.ok(!statuses.some((status) => status.id === 'many_absences'));
}

function testManyAbsencesUsesAcademicYearOnly() {
  const student = baseStudent();
  const payments: Payment[] = [];
  const lessons = [
    baseLesson({
      id: 'old-1',
      date: BEFORE_YEAR,
      attendance: 'absent',
    }),
    baseLesson({
      id: 'old-2',
      date: BEFORE_YEAR,
      attendance: 'absent',
    }),
    baseLesson({
      id: 'old-3',
      date: BEFORE_YEAR,
      attendance: 'absent',
    }),
    baseLesson({
      id: 'new-1',
      date: ON_YEAR_START,
      attendance: 'absent',
    }),
  ];

  const stats = computeStudentAdminStats(student, lessons, payments);
  assert.equal(stats.absencesCount, 1);

  const statuses = computeStudentAdminStatuses(student, stats, payments, []);
  assert.ok(!statuses.some((status) => status.id === 'many_absences'));
}

function testHistoryLessonsAreNotFilteredOut() {
  const lessons = [
    baseLesson({ id: 'old', date: BEFORE_YEAR }),
    baseLesson({ id: 'new', date: ON_YEAR_START }),
  ];

  assert.equal(lessons.length, 2);
  assert.equal(filterLessonsForAcademicStats(lessons).length, 1);
  assert.equal(lessons.length, 2);
}

function run() {
  testAcademicYearStartConstant();
  testLessonBeforeCutoffExcluded();
  testLessonOnCutoffIncluded();
  testLessonAfterCutoffIncluded();
  testOldConductedLessonNotInAcademicStats();
  testOldAbsenceNotInAcademicStats();
  testOldHomeworkNotInAverage();
  testOldHomeworkNotDoneNotCounted();
  testRemainingLessonsUsesFullHistory();
  testGetBalanceUnchangedByAcademicFilter();
  testPaidUntilDateUsesFullHistory();
  testPaymentContextRemainingSlotsUsesFullHistory();
  testNegativeBalanceIndependentOfAcademicFilter();
  testManyAbsencesUsesAcademicYearOnly();
  testHistoryLessonsAreNotFilteredOut();
  console.log('verify-academic-year-balance: all checks passed');
}

run();
