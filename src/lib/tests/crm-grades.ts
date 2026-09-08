import { getRecentHomeworkResults } from '@/lib/tests/student-homework-stats';
import { sortStudentIdsByUpcomingSchedule } from '@/lib/tests/grades-schedule-sort';
import type { StudentHomeworkListItem } from '@/types/tests';
import type { WeeklyScheduleSlot } from '@/types/tutor';

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
  /** ISO timestamp of the newest completed attempt (`test_attempts.completed_at`). */
  latestCompletedAt?: string;
  /** Последние проценты от старых к новым (для простой динамики). */
  recentTrend: number[];
}

export interface CrmStudentGradesCard extends CrmStudentGradesSummary {
  studentId: string;
  studentName: string;
  recent: CrmGradeHomeworkItem[];
}

export type CrmGradesSortId = 'name' | 'schedule' | 'latest';

export const CRM_GRADES_SORT_OPTIONS: {
  id: CrmGradesSortId;
  label: string;
}[] = [
  { id: 'name', label: 'По имени' },
  { id: 'schedule', label: 'По расписанию' },
  { id: 'latest', label: 'По последнему' },
];

export interface SortStudentGradesCardsOptions {
  slots?: WeeklyScheduleSlot[];
  now?: Date;
}

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
      latestCompletedAt: undefined,
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
    latestCompletedAt: completed[0]?.completedAt,
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

export function completedAtTimestampMs(
  completedAt: string | null | undefined,
): number {
  if (!completedAt) return 0;
  const ms = new Date(completedAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function sortStudentGradesCards(
  cards: CrmStudentGradesCard[],
  sortId: CrmGradesSortId,
  options: SortStudentGradesCardsOptions = {},
): CrmStudentGradesCard[] {
  if (sortId === 'schedule') {
    const slots = options.slots ?? [];
    const now = options.now ?? new Date();
    const byId = new Map(cards.map((card) => [card.studentId, card]));
    const orderedIds = sortStudentIdsByUpcomingSchedule(
      cards.map((card) => card.studentId),
      slots,
      now,
    );
    return orderedIds
      .map((id) => byId.get(id))
      .filter((card): card is CrmStudentGradesCard => Boolean(card));
  }

  const copy = [...cards];

  copy.sort((a, b) => {
    switch (sortId) {
      case 'latest': {
        // Newest submission first — full `completed_at` timestamp, not percent/day.
        const timeA = completedAtTimestampMs(a.latestCompletedAt);
        const timeB = completedAtTimestampMs(b.latestCompletedAt);
        if (timeB !== timeA) return timeB - timeA;
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
