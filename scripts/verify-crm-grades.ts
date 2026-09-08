import assert from 'node:assert/strict';
import {
  buildStudentGradesCard,
  isStudentInScheduledSet,
  listCompletedHomeworkItems,
  matchesGradesStudentSearch,
  sortStudentGradesCards,
  summarizeCompletedHomework,
  toCrmGradeHomeworkItem,
} from '../src/lib/tests/crm-grades';
import { getRecentHomeworkResults } from '../src/lib/tests/student-homework-stats';
import { isAssistantAllowedCrmApiRequest } from '../src/lib/auth/crm-access/request-access';
import type { StudentHomeworkListItem } from '../src/types/tests';

function hw(
  partial: Partial<StudentHomeworkListItem> &
    Pick<StudentHomeworkListItem, 'topicId' | 'topicTitle' | 'status'>,
): StudentHomeworkListItem {
  return {
    ...partial,
  };
}

function testOnlyCompletedAppearInRecent() {
  const homework: StudentHomeworkListItem[] = [
    hw({
      topicId: 't1',
      topicTitle: 'Электродинамика',
      status: 'completed',
      attemptId: 'a1',
      finalScore: 18,
      finalMaxScore: 20,
      finalPercent: 90,
      completedAt: '2026-09-07T10:00:00.000Z',
    }),
    hw({
      topicId: 't2',
      topicTitle: 'Механика',
      status: 'assigned',
      assignmentId: 'asg-2',
      source: 'lesson',
    }),
    hw({
      topicId: 't3',
      topicTitle: 'Кинематика',
      status: 'in_progress',
      attemptId: 'a3',
    }),
    hw({
      topicId: 't4',
      topicTitle: 'Оптика',
      status: 'completed',
      attemptId: 'a4',
      finalScore: 14,
      finalMaxScore: 20,
      finalPercent: 70,
      completedAt: '2026-09-04T10:00:00.000Z',
    }),
    hw({
      topicId: 't5',
      topicTitle: 'Термодинамика',
      status: 'completed',
      attemptId: 'a5',
      finalScore: 17,
      finalMaxScore: 20,
      finalPercent: 85,
      completedAt: '2026-09-01T10:00:00.000Z',
    }),
  ];

  const completed = listCompletedHomeworkItems(homework);
  assert.equal(completed.length, 3);
  assert.equal(completed[0].topicTitle, 'Электродинамика');
  assert.equal(completed[1].topicTitle, 'Оптика');
  assert.equal(completed[2].topicTitle, 'Термодинамика');
  assert.deepEqual(
    completed.map((item) => item.attemptId),
    ['a1', 'a4', 'a5'],
  );

  const card = buildStudentGradesCard({
    studentId: 's1',
    studentName: 'Иван Иванов',
    completed,
    recentLimit: 2,
  });

  assert.equal(card.recent.length, 2);
  assert.equal(card.recent[0].attemptId, 'a1');
  assert.equal(card.recent[0].finalScore, 18);
  assert.equal(card.recent[0].finalMaxScore, 20);
  assert.equal(card.recent[0].finalPercent, 90);
  assert.equal(card.recent[1].attemptId, 'a4');
  assert.equal(card.completedCount, 3);
  assert.equal(Math.round(card.avgPercent ?? 0), 82);
  assert.equal(card.latestPercent, 90);

  // Parity with student dashboard helper
  const studentRecent = getRecentHomeworkResults(homework, 2);
  assert.equal(studentRecent[0]?.attemptId, card.recent[0].attemptId);
  assert.equal(studentRecent[1]?.attemptId, card.recent[1].attemptId);
}

function testSingleAndEmptyCompleted() {
  const one = listCompletedHomeworkItems([
    hw({
      topicId: 't1',
      topicTitle: 'Механика',
      status: 'completed',
      attemptId: 'a1',
      finalScore: 14,
      finalMaxScore: 20,
      finalPercent: 70,
      completedAt: '2026-09-04T10:00:00.000Z',
    }),
  ]);
  assert.equal(one.length, 1);

  const emptyCard = buildStudentGradesCard({
    studentId: 's2',
    studentName: 'Пётр Петров',
    completed: [],
  });
  assert.equal(emptyCard.recent.length, 0);
  assert.equal(emptyCard.completedCount, 0);
  assert.equal(emptyCard.avgPercent, null);
}

function testSummaryTrendAndFullList() {
  const completed = [
    toCrmGradeHomeworkItem(
      hw({
        topicId: 't1',
        topicTitle: 'A',
        status: 'completed',
        attemptId: 'a1',
        finalScore: 18,
        finalMaxScore: 20,
        finalPercent: 90,
        completedAt: '2026-09-07T10:00:00.000Z',
      }),
    )!,
    toCrmGradeHomeworkItem(
      hw({
        topicId: 't2',
        topicTitle: 'B',
        status: 'completed',
        attemptId: 'a2',
        finalScore: 17,
        finalMaxScore: 20,
        finalPercent: 85,
        completedAt: '2026-09-05T10:00:00.000Z',
      }),
    )!,
    toCrmGradeHomeworkItem(
      hw({
        topicId: 't3',
        topicTitle: 'C',
        status: 'completed',
        attemptId: 'a3',
        finalScore: 16,
        finalMaxScore: 20,
        finalPercent: 78,
        completedAt: '2026-09-03T10:00:00.000Z',
      }),
    )!,
    toCrmGradeHomeworkItem(
      hw({
        topicId: 't4',
        topicTitle: 'D',
        status: 'completed',
        attemptId: 'a4',
        finalScore: 14,
        finalMaxScore: 20,
        finalPercent: 72,
        completedAt: '2026-09-01T10:00:00.000Z',
      }),
    )!,
  ];

  const summary = summarizeCompletedHomework(completed);
  assert.deepEqual(
    summary.recentTrend.map((v) => Math.round(v)),
    [72, 78, 85, 90],
  );
  assert.equal(summary.completedCount, 4);
  assert.equal(summary.latestPercent, 90);
}

function testSearchAndSort() {
  const cards = [
    buildStudentGradesCard({
      studentId: '1',
      studentName: 'Борис Борисов',
      completed: [
        {
          attemptId: 'a',
          topicId: 't',
          topicTitle: 'T',
          finalScore: 10,
          finalMaxScore: 20,
          finalPercent: 50,
          completedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    }),
    buildStudentGradesCard({
      studentId: '2',
      studentName: 'Анна Аннова',
      completed: [
        {
          attemptId: 'b',
          topicId: 't',
          topicTitle: 'T',
          finalScore: 18,
          finalMaxScore: 20,
          finalPercent: 90,
          completedAt: '2026-09-07T00:00:00.000Z',
        },
      ],
    }),
  ];

  assert.equal(matchesGradesStudentSearch('Анна Аннова', 'анн'), true);
  assert.equal(matchesGradesStudentSearch('Анна Аннова', 'борис'), false);

  const byName = sortStudentGradesCards(cards, 'name');
  assert.equal(byName[0].studentName, 'Анна Аннова');

  const byAvg = sortStudentGradesCards(cards, 'avg');
  assert.equal(byAvg[0].studentName, 'Анна Аннова');
  assert.equal(byAvg[1].studentName, 'Борис Борисов');
}

function testScheduleAccessHelper() {
  const scheduled = new Set(['s1', 's2']);
  assert.equal(isStudentInScheduledSet('s1', scheduled), true);
  assert.equal(isStudentInScheduledSet('foreign', scheduled), false);
}

function testAssistantGradesApiAllowlist() {
  assert.equal(
    isAssistantAllowedCrmApiRequest('GET', '/api/crm/grades'),
    true,
  );
  assert.equal(
    isAssistantAllowedCrmApiRequest('GET', '/api/crm/grades/s1'),
    true,
  );
  assert.equal(
    isAssistantAllowedCrmApiRequest(
      'GET',
      '/api/crm/grades/s1/attempts/a1',
    ),
    true,
  );
  assert.equal(
    isAssistantAllowedCrmApiRequest('POST', '/api/crm/grades'),
    false,
  );
  assert.equal(
    isAssistantAllowedCrmApiRequest('GET', '/api/crm/payments'),
    false,
  );
}

function testIncompleteCompletedSkipped() {
  const skipped = toCrmGradeHomeworkItem(
    hw({
      topicId: 't1',
      topicTitle: 'Broken',
      status: 'completed',
      // missing scores / attempt
    }),
  );
  assert.equal(skipped, null);
}

testOnlyCompletedAppearInRecent();
testSingleAndEmptyCompleted();
testSummaryTrendAndFullList();
testSearchAndSort();
testScheduleAccessHelper();
testAssistantGradesApiAllowlist();
testIncompleteCompletedSkipped();

console.log('verify-crm-grades: all checks passed');
