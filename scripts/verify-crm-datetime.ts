import assert from 'node:assert/strict';
import { buildLessonHistoryGroups } from '../src/lib/lesson-history';
import {
  CRM_DATE_DISPLAY_FALLBACK,
  formatCrmDate,
  formatCrmDateTime,
  formatCrmMoscowDateKey,
  getCrmDateMs,
  normalizeCrmDateInput,
  normalizeDateKeyToDashes,
  parseCrmDate,
} from '../src/lib/crm-datetime';
import type { Lesson } from '../src/types/tutor';

function assertNoThrow(label: string, fn: () => unknown): void {
  try {
    fn();
  } catch (error) {
    assert.fail(`${label} threw: ${error instanceof Error ? error.message : error}`);
  }
}

function recentCompletedLesson(
  id: string,
  date: string,
  overrides: Partial<Lesson> = {},
): Lesson {
  return {
    id,
    studentId: 'student-1',
    date,
    status: 'completed',
    paymentStatus: 'paid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    makeupStatus: 'none',
    ...overrides,
  };
}

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

test('normalizeCrmDateInput handles slash date-only', () => {
  assert.equal(
    normalizeCrmDateInput('2026/08/07'),
    '2026-08-07T12:00:00+03:00',
  );
});

test('normalizeDateKeyToDashes converts slash keys', () => {
  assert.equal(normalizeDateKeyToDashes('2026/08/07'), '2026-08-07');
  assert.equal(normalizeDateKeyToDashes('2026-08-07'), '2026-08-07');
});

test('formatCrmMoscowDateKey always returns dashed YYYY-MM-DD', () => {
  const key = formatCrmMoscowDateKey('2026-08-07T10:00:00+03:00');
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(key, '2026-08-07');
});

test('normalizeCrmDateInput handles ISO with timezone', () => {
  assert.equal(
    normalizeCrmDateInput('2026-07-24T10:00:00+03:00'),
    '2026-07-24T10:00:00+03:00',
  );
});

test('normalizeCrmDateInput handles ISO with Z', () => {
  assert.equal(
    normalizeCrmDateInput('2026-07-24T07:00:00.000Z'),
    '2026-07-24T07:00:00.000Z',
  );
});

test('normalizeCrmDateInput expands date-only to Moscow noon', () => {
  assert.equal(
    normalizeCrmDateInput('2026-07-24'),
    '2026-07-24T12:00:00+03:00',
  );
});

test('normalizeCrmDateInput converts Postgres space format', () => {
  assert.equal(
    normalizeCrmDateInput('2026-07-24 10:00:00'),
    '2026-07-24T10:00:00+03:00',
  );
});

test('normalizeCrmDateInput handles null, undefined, empty', () => {
  assert.equal(normalizeCrmDateInput(null), '');
  assert.equal(normalizeCrmDateInput(undefined), '');
  assert.equal(normalizeCrmDateInput(''), '');
  assert.equal(normalizeCrmDateInput('   '), '');
});

test('parseCrmDate returns null for invalid input', () => {
  assert.equal(parseCrmDate(null), null);
  assert.equal(parseCrmDate(undefined), null);
  assert.equal(parseCrmDate(''), null);
  assert.equal(parseCrmDate('invalid'), null);
  assert.equal(parseCrmDate('2026-07-99T10:00:00'), null);
});

test('parseCrmDate parses valid CRM strings', () => {
  assert.ok(parseCrmDate('2026-07-24T10:00:00+03:00'));
  assert.ok(parseCrmDate('2026-07-24T07:00:00.000Z'));
  assert.ok(parseCrmDate('2026-07-24'));
  assert.ok(parseCrmDate('2026-07-24 10:00:00'));
});

test('formatters never throw and use fallback for invalid dates', () => {
  const invalidInputs: Array<string | null | undefined> = [
    '2026-07-24T10:00:00+03:00',
    '2026-07-24T07:00:00.000Z',
    '2026-07-24',
    '2026-07-24 10:00:00',
    null,
    undefined,
    '',
    'invalid',
    '2026-07-99T10:00:00',
  ];

  for (const value of invalidInputs) {
    assertNoThrow(`formatCrmDate(${String(value)})`, () =>
      formatCrmDate(value),
    );
    assertNoThrow(`formatCrmDateTime(${String(value)})`, () =>
      formatCrmDateTime(value),
    );
  }

  assert.equal(formatCrmDate('invalid'), CRM_DATE_DISPLAY_FALLBACK);
  assert.equal(formatCrmDateTime(null), CRM_DATE_DISPLAY_FALLBACK);
});

test('getCrmDateMs returns finite ms for Postgres-style datetime', () => {
  const ms = getCrmDateMs('2026-07-24 10:00:00');
  assert.ok(ms !== null && Number.isFinite(ms));
});

test('buildLessonHistoryGroups skips invalid lesson without throwing', () => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const validDate = `${todayKey}T12:00:00+03:00`;

  const groups = buildLessonHistoryGroups([
    recentCompletedLesson('good', validDate),
    recentCompletedLesson('bad', '2026-07-99T10:00:00'),
    recentCompletedLesson('bad-space', 'totally-not-a-date'),
  ]);

  assertNoThrow('buildLessonHistoryGroups', () => groups);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.lessons.length, 1);
  assert.equal(groups[0]?.lessons[0]?.id, 'good');
});

if (errors.length > 0) {
  console.error('verify-crm-datetime failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('verify-crm-datetime passed');
