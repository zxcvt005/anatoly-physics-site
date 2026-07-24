import {
  CRM_DATE_DISPLAY_FALLBACK,
  getCrmDateMs,
  logSkippedInvalidCrmDate,
  parseCrmDate,
} from '@/lib/crm-datetime';
import { getLessonDateKey } from '@/lib/lesson-utils';
import type { Lesson, LessonType, Student } from '@/types/tutor';

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  regular: 'Обычное',
  makeup: 'Отработка',
  extra: 'Дополнительное',
  transfer: 'Перенос',
};

export type LessonHeldStatus = 'held' | 'not_held' | 'transferred';

export interface LessonHistoryDayGroup {
  dateKey: string;
  dayLabel: string;
  lessons: Lesson[];
}

export function formatHistoryDayHeader(dateKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return CRM_DATE_DISPLAY_FALLBACK;
  }

  const date = parseCrmDate(`${dateKey}T12:00:00+03:00`);
  if (!date) {
    return CRM_DATE_DISPLAY_FALLBACK;
  }

  const formatted = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getLessonHeldStatus(lesson: Lesson): LessonHeldStatus {
  if (lesson.attendance === 'transferred') return 'transferred';
  if (lesson.attendance === 'absent') return 'not_held';
  return 'held';
}

export function getLessonHeldLabel(status: LessonHeldStatus): string {
  if (status === 'transferred') return 'Перенесено';
  return status === 'held' ? 'Состоялось' : 'Не состоялось';
}

function getHistoryWindow(referenceDate: Date = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);

  const start = new Date(referenceDate);
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function compareLessonDates(a: Lesson, b: Lesson): number {
  const aMs = getCrmDateMs(a.date) ?? 0;
  const bMs = getCrmDateMs(b.date) ?? 0;
  return aMs - bMs;
}

/** Завершённые занятия за последние 14 дней, сгруппированные по дням */
export function buildLessonHistoryGroups(
  lessons: Lesson[],
  _daysBack = 14,
): LessonHistoryDayGroup[] {
  const { start, end } = getHistoryWindow();
  const startMs = start.getTime();
  const endMs = end.getTime();

  const completedRecent = lessons
    .filter((lesson) => {
      if (lesson.status !== 'completed') {
        return false;
      }

      const time = getCrmDateMs(lesson.date);
      if (time === null) {
        logSkippedInvalidCrmDate({
          component: 'buildLessonHistoryGroups',
          field: 'lesson.date',
          itemId: lesson.id,
          rawValue: lesson.date,
        });
        return false;
      }

      return time >= startMs && time <= endMs;
    })
    .sort(compareLessonDates);

  const groups = new Map<string, Lesson[]>();

  for (const lesson of completedRecent) {
    const dateKey = getLessonDateKey(lesson.date);
    if (!dateKey) {
      logSkippedInvalidCrmDate({
        component: 'buildLessonHistoryGroups',
        field: 'lesson.date',
        itemId: lesson.id,
        rawValue: lesson.date,
      });
      continue;
    }

    const existing = groups.get(dateKey) ?? [];
    existing.push(lesson);
    groups.set(dateKey, existing);
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateKey, dayLessons]) => ({
      dateKey,
      dayLabel: formatHistoryDayHeader(dateKey),
      lessons: [...dayLessons].sort(compareLessonDates),
    }));
}

export function getStudentDisplayName(student: Student | undefined): string {
  if (student) return student.name;
  return 'Неизвестный ученик';
}
