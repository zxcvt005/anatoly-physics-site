import assert from 'node:assert/strict';
import {
  buildStudentMockExamViews,
  calculateScorePercent,
  computeExamFillStats,
  computeStudentMockExamStats,
  formatScorePercent,
  getHighestScoreForExam,
  sortMockExamsChronologically,
} from '../src/lib/mock-exams/calculations';
import type { MockExam, MockExamResult } from '../src/lib/mock-exams/types';
import {
  generateMockExamId,
  isValidExamDate,
  parseIntegerScore,
  resolveEnterCellNavigation,
  resultKey,
  validateMockExamInput,
  validateMockExamUpdate,
  validateScoreInput,
} from '../src/lib/mock-exams/validation';
import { isAssistantAllowedCrmApiRequest } from '../src/lib/auth/crm-access/request-access';
import { STUDENT_HARD_DELETE_CASCADE_STEPS } from '../src/lib/supabase/students/delete-student-policy';

const errors: string[] = [];
let passed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function exam(
  id: string,
  title: string,
  examDate: string,
  maxScore: number,
  createdAt = `${examDate}T10:00:00.000Z`,
): MockExam {
  return { id, title, examDate, maxScore, createdAt };
}

function result(
  mockExamId: string,
  studentId: string,
  score: number,
): MockExamResult {
  return {
    id: `res-${mockExamId}-${studentId}`,
    mockExamId,
    studentId,
    score,
  };
}

test('validateMockExamInput requires title, date and positive maxScore', () => {
  assert.equal(validateMockExamInput({ title: '', examDate: '2026-09-15', maxScore: 45 }).ok, false);
  assert.equal(validateMockExamInput({ title: 'A', examDate: '15.09.2026', maxScore: 45 }).ok, false);
  assert.equal(validateMockExamInput({ title: 'A', examDate: '2026-09-15', maxScore: 0 }).ok, false);
  assert.equal(validateMockExamInput({ title: 'A', examDate: '2026-09-15', maxScore: 1.5 }).ok, false);
  const ok = validateMockExamInput({
    title: '  Пробник №1  ',
    examDate: '2026-09-15',
    maxScore: 45,
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.title, 'Пробник №1');
  }
});

test('isValidExamDate rejects impossible calendar dates', () => {
  assert.equal(isValidExamDate('2026-09-15'), true);
  assert.equal(isValidExamDate('2026-02-30'), false);
  assert.equal(isValidExamDate('2026-13-01'), false);
});

test('score validation distinguishes empty, zero and invalid values', () => {
  assert.deepEqual(validateScoreInput('', 45), { ok: true, clear: true });
  assert.deepEqual(validateScoreInput('0', 45), { ok: true, score: 0 });
  assert.deepEqual(validateScoreInput('45', 45), { ok: true, score: 45 });
  assert.equal(validateScoreInput('46', 45).ok, false);
  assert.equal(validateScoreInput('-1', 45).ok, false);
  assert.equal(validateScoreInput('3.5', 45).ok, false);
  assert.equal(validateScoreInput('abc', 45).ok, false);
  assert.equal(validateScoreInput('NaN', 45).ok, false);
  assert.equal(parseIntegerScore('37'), 37);
  assert.equal(parseIntegerScore('3.5'), null);
});

test('maxScore update cannot go below highest existing score', () => {
  const blocked = validateMockExamUpdate(
    { maxScore: 40 },
    { highestExistingScore: 42 },
  );
  assert.equal(blocked.ok, false);

  const allowed = validateMockExamUpdate(
    { maxScore: 50 },
    { highestExistingScore: 42 },
  );
  assert.equal(allowed.ok, true);
});

test('percent calculations support different max scores', () => {
  assert.ok(Math.abs(calculateScorePercent(37, 45) - (37 / 45) * 100) < 1e-9);
  assert.ok(Math.abs(calculateScorePercent(28, 30) - (28 / 30) * 100) < 1e-9);
  assert.equal(formatScorePercent(82.222), '82.2%');
});

test('student stats use percentages and chronological order', () => {
  const exams = [
    exam('b', '№2', '2026-09-20', 40),
    exam('a', '№1', '2026-09-10', 45),
    exam('c', '№3', '2026-09-20', 30, '2026-09-20T12:00:00.000Z'),
  ];
  const sorted = sortMockExamsChronologically(exams);
  assert.deepEqual(
    sorted.map((item) => item.id),
    ['a', 'b', 'c'],
  );

  const views = buildStudentMockExamViews(exams, [
    result('a', 's1', 37),
    result('c', 's1', 28),
    result('b', 's1', 20),
  ]);
  assert.deepEqual(
    views.map((view) => view.exam.id),
    ['a', 'b', 'c'],
  );

  const stats = computeStudentMockExamStats(views);
  assert.equal(stats.count, 3);
  assert.ok(stats.averagePercent !== null);
  assert.ok(Math.abs(stats.averagePercent! - (
    calculateScorePercent(37, 45) +
    calculateScorePercent(20, 40) +
    calculateScorePercent(28, 30)
  ) / 3) < 1e-9);
  assert.equal(stats.bestPercent, calculateScorePercent(28, 30));
  assert.equal(stats.latestPercent, calculateScorePercent(28, 30));
});

test('empty cells are not treated as zero in averages', () => {
  const examItem = exam('a', '№1', '2026-09-10', 45);
  const stats = computeExamFillStats(
    examItem,
    [result('a', 's1', 37), result('a', 's2', 28)],
    4,
  );
  assert.equal(stats.filled, 2);
  assert.equal(stats.total, 4);
  assert.equal(stats.averageScore, 32.5);
  assert.equal(getHighestScoreForExam('a', [result('a', 's1', 37), result('a', 's2', 28)]), 37);
});

test('Enter navigation moves down and stays on last row', () => {
  assert.deepEqual(resolveEnterCellNavigation(0, 4), {
    nextRowIndex: 1,
    stay: false,
  });
  assert.deepEqual(resolveEnterCellNavigation(3, 4), {
    nextRowIndex: 3,
    stay: true,
  });
  assert.deepEqual(resolveEnterCellNavigation(0, 0), {
    nextRowIndex: 0,
    stay: true,
  });
});

test('result keys isolate student and exam pairs', () => {
  assert.equal(resultKey('s1', 'm1'), 's1:m1');
  assert.ok(generateMockExamId().startsWith('mock-'));
});

test('assistant is allowed to access mock-exams CRM API', () => {
  assert.equal(isAssistantAllowedCrmApiRequest('GET', '/api/crm/mock-exams'), true);
  assert.equal(isAssistantAllowedCrmApiRequest('POST', '/api/crm/mock-exams'), true);
  assert.equal(
    isAssistantAllowedCrmApiRequest('PATCH', '/api/crm/mock-exams/results'),
    true,
  );
  assert.equal(
    isAssistantAllowedCrmApiRequest('DELETE', '/api/crm/mock-exams/mock-1'),
    true,
  );
});

test('student delete cascade policy includes mock_exam_results', () => {
  assert.ok(STUDENT_HARD_DELETE_CASCADE_STEPS.includes('mock_exam_results'));
});

test('student API security filter keeps only own results', () => {
  const ownStudentId = 'student-own';
  const foreignStudentId = 'student-other';
  const payload = {
    exams: [exam('m1', '№1', '2026-09-10', 45), exam('m2', '№2', '2026-09-11', 40)],
    results: [
      result('m1', ownStudentId, 37),
      result('m1', foreignStudentId, 41),
      result('m2', foreignStudentId, 30),
    ],
  };

  const results = payload.results.filter((item) => item.studentId === ownStudentId);
  const examIds = new Set(results.map((item) => item.mockExamId));
  const exams = payload.exams.filter((item) => examIds.has(item.id));

  assert.equal(results.length, 1);
  assert.equal(results[0]?.score, 37);
  assert.deepEqual(
    exams.map((item) => item.id),
    ['m1'],
  );
  assert.equal(
    results.some((item) => item.studentId === foreignStudentId),
    false,
  );
});

test('buildStudentMockExamViews ignores exams without a score row', () => {
  const views = buildStudentMockExamViews(
    [exam('m1', '№1', '2026-09-10', 45), exam('m2', '№2', '2026-09-11', 40)],
    [result('m2', 's1', 0)],
  );
  assert.equal(views.length, 1);
  assert.equal(views[0]?.score, 0);
  assert.equal(views[0]?.percent, 0);
});

if (errors.length > 0) {
  console.error('verify-mock-exams failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-mock-exams passed (${passed} tests)`);
