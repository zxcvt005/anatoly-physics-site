import { getRecentHomeworkResults } from '@/lib/tests/student-homework-stats';
import type { StudentHomeworkListItem } from '@/types/tests';

export interface CrmGradeHomeworkItem {
  attemptId: string;
  topicId: string;
  topicTitle: string;
  sectionTitle?: string;
  completedAt?: string;
  finalScore: number;
  finalMaxScore: number;
  finalPercent: number;
}

export interface CrmStudentGradesSummary {
  avgPercent: number | null;
  completedCount: number;
  latestPercent: number | null;
  /** Последние проценты от старых к новым (для простой динамики). */
  recentTrend: number[];
}

export interface CrmStudentGradesCard extends CrmStudentGradesSummary {
  studentId: string;
  studentName: string;
  recent: CrmGradeHomeworkItem[];
}

export type CrmGradesSortId = 'name' | 'avg' | 'latest';

export const CRM_GRADES_SORT_OPTIONS: {
  id: CrmGradesSortId;
  label: string;
}[] = [
  { id: 'name', label: 'По имени' },
  { id: 'avg', label: 'По среднему' },
  { id: 'latest', label: 'По последнему' },
];

const TREND_LIMIT = 4;

export function toCrmGradeHomeworkItem(
  item: StudentHomeworkListItem,
): CrmGradeHomeworkItem | null {
  if (
    item.status !== 'completed' ||
    !item.attemptId ||
    item.finalScore === undefined ||
    item.finalMaxScore === undefined ||
    item.finalPercent === undefined
  ) {
    return null;
  }

  return {
    attemptId: item.attemptId,
    topicId: item.topicId,
    topicTitle: item.topicTitle,
    sectionTitle: item.sectionTitle,
    completedAt: item.completedAt,
    finalScore: item.finalScore,
    finalMaxScore: item.finalMaxScore,
    finalPercent: item.finalPercent,
  };
}

/** Все выполненные ДЗ, новые сверху — та же семантика, что у студентки. */
export function listCompletedHomeworkItems(
  homework: StudentHomeworkListItem[],
): CrmGradeHomeworkItem[] {
  return getRecentHomeworkResults(homework, homework.length)
    .map(toCrmGradeHomeworkItem)
    .filter((item): item is CrmGradeHomeworkItem => item !== null);
}

export function summarizeCompletedHomework(
  completed: CrmGradeHomeworkItem[],
  trendLimit = TREND_LIMIT,
): CrmStudentGradesSummary {
  if (completed.length === 0) {
    return {
      avgPercent: null,
      completedCount: 0,
      latestPercent: null,
      recentTrend: [],
    };
  }

  const avgPercent =
    completed.reduce((sum, item) => sum + item.finalPercent, 0) /
    completed.length;

  const chronological = [...completed].sort((a, b) => {
    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return dateA - dateB;
  });

  const recentTrend = chronological
    .slice(-trendLimit)
    .map((item) => item.finalPercent);

  return {
    avgPercent,
    completedCount: completed.length,
    latestPercent: completed[0]?.finalPercent ?? null,
    recentTrend,
  };
}

export function buildStudentGradesCard(input: {
  studentId: string;
  studentName: string;
  completed: CrmGradeHomeworkItem[];
  recentLimit?: number;
}): CrmStudentGradesCard {
  const summary = summarizeCompletedHomework(input.completed);
  return {
    studentId: input.studentId,
    studentName: input.studentName,
    ...summary,
    recent: input.completed.slice(0, input.recentLimit ?? 2),
  };
}

export function matchesGradesStudentSearch(
  studentName: string,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return studentName.toLowerCase().includes(normalized);
}

export function sortStudentGradesCards(
  cards: CrmStudentGradesCard[],
  sortId: CrmGradesSortId,
): CrmStudentGradesCard[] {
  const copy = [...cards];

  copy.sort((a, b) => {
    switch (sortId) {
      case 'avg': {
        const avgA = a.avgPercent ?? -1;
        const avgB = b.avgPercent ?? -1;
        if (avgB !== avgA) return avgB - avgA;
        return a.studentName.localeCompare(b.studentName, 'ru');
      }
      case 'latest': {
        const latestA = a.latestPercent ?? -1;
        const latestB = b.latestPercent ?? -1;
        if (latestB !== latestA) return latestB - latestA;
        return a.studentName.localeCompare(b.studentName, 'ru');
      }
      case 'name':
      default:
        return a.studentName.localeCompare(b.studentName, 'ru');
    }
  });

  return copy;
}

export function isStudentInScheduledSet(
  studentId: string,
  scheduledStudentIds: ReadonlySet<string>,
): boolean {
  return scheduledStudentIds.has(studentId);
}

export function scoreTone(
  percent: number | null | undefined,
): 'high' | 'mid' | 'low' | 'empty' {
  if (percent === null || percent === undefined) return 'empty';
  if (percent >= 80) return 'high';
  if (percent >= 60) return 'mid';
  return 'low';
}
