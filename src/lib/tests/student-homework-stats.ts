import type { StudentHomeworkListItem } from '@/types/tests';

export interface StudentHomeworkStats {
  totalWithTest: number;
  completed: number;
  assigned: number;
  inProgress: number;
  avgPercent: number | null;
  bestPercent: number | null;
  completionRate: number | null;
}

export function computeStudentHomeworkStats(
  homework: StudentHomeworkListItem[],
): StudentHomeworkStats {
  const withTest = homework.filter((item) => item.testId);
  const completed = withTest.filter((item) => item.status === 'completed');
  const assigned = withTest.filter(
    (item) => item.source === 'lesson' && item.status !== 'completed',
  );
  const inProgress = withTest.filter((item) => item.status === 'in_progress');

  const percents = completed
    .map((item) => item.finalPercent)
    .filter((value): value is number => value !== undefined);

  const avgPercent =
    percents.length > 0
      ? percents.reduce((sum, value) => sum + value, 0) / percents.length
      : null;

  const bestPercent = percents.length > 0 ? Math.max(...percents) : null;

  const completionRate =
    withTest.length > 0 ? (completed.length / withTest.length) * 100 : null;

  return {
    totalWithTest: withTest.length,
    completed: completed.length,
    assigned: assigned.length,
    inProgress: inProgress.length,
    avgPercent,
    bestPercent,
    completionRate,
  };
}

export function getRecentHomeworkResults(
  homework: StudentHomeworkListItem[],
  limit = 5,
): StudentHomeworkListItem[] {
  return homework
    .filter(
      (item) => item.status === 'completed' && item.finalPercent !== undefined,
    )
    .sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

export function getActiveHomeworkItems(
  homework: StudentHomeworkListItem[],
): StudentHomeworkListItem[] {
  return homework.filter(
    (item) =>
      item.testId &&
      (item.status === 'assigned' ||
        item.status === 'in_progress' ||
        (item.source === 'lesson' && item.status !== 'completed')),
  );
}

export function getCurrentLessonHomework(
  homework: StudentHomeworkListItem[],
): StudentHomeworkListItem | null {
  return (
    homework.find(
      (item) =>
        item.source === 'lesson' &&
        (item.status === 'assigned' || item.status === 'in_progress'),
    ) ?? null
  );
}
