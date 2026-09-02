/**
 * Verifies that a trial lesson can be created without a last name,
 * while last-name tagging and later editing still work.
 *
 * Run: npm run verify:trial-lesson-optional-last-name
 */
import assert from 'node:assert/strict';
import { formatStudentCheckboxLabel } from '../src/lib/schedule-utils';
import {
  buildStudentName,
  generateStudentToken,
  normalizeStudent,
} from '../src/lib/student-utils';
import { trialLessonToInsertRow } from '../src/lib/supabase/trial-lessons/mappers';
import { findStudentByName } from '../src/lib/trial-lesson-utils';
import {
  isTrialLessonFormReady,
  normalizeTrialLastName,
  withNormalizedTrialLastName,
} from '../src/lib/trial-lessons/form';
import { formatStudentShortName } from '../src/lib/tutor-calculations';
import type { Student, TrialLesson } from '../src/types/tutor';

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

function sampleFormFields(overrides: Partial<Parameters<typeof isTrialLessonFormReady>[0]> = {}) {
  return {
    firstName: 'Алина',
    trialDate: '2026-09-02',
    gradeClass: '9',
    goal: 'ЕГЭ',
    currentResult: '4',
    proposedRate4Weeks: 12000,
    proposedLessonsPerWeek: 2,
    parentContacts: '+7 900 000-00-00',
    ...overrides,
  };
}

function sampleTrial(overrides: Partial<TrialLesson> = {}): TrialLesson {
  return {
    id: 'trial-optional-last-name',
    firstName: 'Алина',
    lastName: '',
    trialDate: '2026-09-02',
    gradeClass: '9',
    goal: 'ЕГЭ',
    currentResult: '4',
    proposedRate4Weeks: 12000,
    proposedLessonsPerWeek: 2,
    parentContacts: '+7 900 000-00-00',
    callStatus: 'not_called',
    createdAt: '2026-09-02T00:00:00.000Z',
    ...overrides,
  };
}

function sampleStudent(overrides: Partial<Student> = {}): Student {
  return normalizeStudent({
    id: 's-1',
    firstName: 'Алина',
    lastName: 'Иванова',
    name: '',
    gradeClass: '9',
    token: 'ivanova2026',
    rate4Weeks: 12000,
    lessonsPerWeek: 2,
    ratePerLesson: 0,
    ...overrides,
  });
}

test('создание пробного урока без фамилии успешно', () => {
  assert.equal(isTrialLessonFormReady(sampleFormFields()), true);

  const created = withNormalizedTrialLastName(
    sampleTrial({ lastName: '   ' }),
  );
  assert.equal(created.lastName, '');
  assert.equal(created.firstName, 'Алина');

  const row = trialLessonToInsertRow(created, null);
  assert.equal(row.last_name, '');
  assert.equal(row.first_name, 'Алина');
  assert.notEqual(row.last_name, 'Не указано');
  assert.notEqual(row.last_name, 'Без фамилии');
  assert.notEqual(row.last_name, '—');
});

test('создание пробного урока с фамилией работает как раньше', () => {
  assert.equal(isTrialLessonFormReady(sampleFormFields()), true);

  const created = withNormalizedTrialLastName(
    sampleTrial({ lastName: '  Иванова  ' }),
  );
  assert.equal(created.lastName, 'Иванова');

  const row = trialLessonToInsertRow(created, null);
  assert.equal(row.last_name, 'Иванова');
});

test('имя по-прежнему обязательно', () => {
  assert.equal(
    isTrialLessonFormReady(sampleFormFields({ firstName: '   ' })),
    false,
  );
});

test('normalizeTrialLastName хранит пустое значение, а не заглушку', () => {
  assert.equal(normalizeTrialLastName(''), '');
  assert.equal(normalizeTrialLastName('   '), '');
  assert.equal(normalizeTrialLastName(null), '');
  assert.equal(normalizeTrialLastName(undefined), '');
  assert.equal(normalizeTrialLastName('Иванова'), 'Иванова');
});

test('позднее можно добавить фамилию в ту же запись', () => {
  const created = withNormalizedTrialLastName(sampleTrial({ lastName: '' }));
  assert.equal(created.lastName, '');

  const updated = withNormalizedTrialLastName({
    ...created,
    lastName: 'Иванова',
  });

  assert.equal(updated.id, created.id);
  assert.equal(updated.lastName, 'Иванова');
  assert.equal(updated.firstName, 'Алина');
});

test('тегирование с фамилией сохраняет формат «Имя Ф.»', () => {
  assert.equal(formatStudentShortName('Алина Иванова'), 'Алина И.');
  assert.equal(
    formatStudentCheckboxLabel(sampleStudent()),
    'Алина И.',
  );
});

test('тегирование без фамилии не падает и использует имя', () => {
  assert.equal(formatStudentShortName('Алина'), 'Алина');
  assert.equal(
    formatStudentCheckboxLabel(
      sampleStudent({ lastName: '', name: 'Алина' }),
    ),
    'Алина',
  );
  assert.equal(buildStudentName('Алина', ''), 'Алина');
});

test('токен без фамилии берёт имя, с фамилией — фамилию', () => {
  const year = new Date().getFullYear();
  assert.equal(
    generateStudentToken('Иванова', new Set()),
    `ivanova${year}`,
  );
  assert.equal(
    generateStudentToken('', new Set(), 'Алина'),
    `alina${year}`,
  );
  assert.equal(generateStudentToken('', new Set()), `student${year}`);
});

test('поиск студента по имени не склеивает записи без фамилии', () => {
  const students = [
    sampleStudent({ id: 's-empty', lastName: '', name: 'Алина' }),
    sampleStudent({ id: 's-named', lastName: 'Иванова', name: 'Алина Иванова' }),
  ];

  assert.equal(findStudentByName(students, 'Алина', ''), undefined);
  assert.equal(findStudentByName(students, 'Алина', 'Иванова')?.id, 's-named');
});

if (errors.length > 0) {
  console.error('verify-trial-lesson-optional-last-name failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('verify-trial-lesson-optional-last-name passed');
