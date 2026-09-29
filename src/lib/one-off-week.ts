import {
  addDaysToMoscowDateKey,
  formatLessonStartTime,
  getMoscowDateKey,
  getMoscowWeekday,
  getMoscowWeekdayFromDateKey,
  normalizeTimeToHm,
} from '@/lib/lesson-datetime';
import { WEEKDAY_ORDER } from '@/lib/tutor-calculations';
import type { Lesson, WeeklyScheduleSlot } from '@/types/tutor';

export function isInCurrentMoscowWeek(
  dateStr: string,
  todayDateKey: string = getMoscowDateKey(),
): boolean {
  const dateKey = getMoscowDateKey(dateStr);
  if (!dateKey) return false;

  const todayWeekday = getMoscowWeekdayFromDateKey(todayDateKey);
  const mondayOffset = todayWeekday === 0 ? -6 : 1 - todayWeekday;
  const mondayKey = addDaysToMoscowDateKey(todayDateKey, mondayOffset);
  const sundayKey = addDaysToMoscowDateKey(mondayKey, 6);

  return dateKey >= mondayKey && dateKey <= sundayKey;
}

export function getOneOffLessonsForWeekday(
  lessons: Lesson[],
  weekday: number,
  todayDateKey: string = getMoscowDateKey(),
): Lesson[] {
  return lessons
    .filter(
      (lesson) =>
        lesson.isOutsideSchedule &&
        lesson.status === 'scheduled' &&
        getMoscowWeekday(lesson.date) === weekday &&
        isInCurrentMoscowWeek(lesson.date, todayDateKey),
    )
    .sort(
      (a, b) =>
        (getMoscowDateKey(a.date) + a.date).localeCompare(
          getMoscowDateKey(b.date) + b.date,
        ),
    );
}

export function buildOneOffByWeekday(
  lessons: Lesson[],
  todayDateKey: string = getMoscowDateKey(),
): Map<number, Lesson[]> {
  const map = new Map<number, Lesson[]>();
  for (const weekday of WEEKDAY_ORDER) {
    map.set(weekday, getOneOffLessonsForWeekday(lessons, weekday, todayDateKey));
  }
  return map;
}

export type WeekGridItem =
  | {
      kind: 'slot';
      id: string;
      startTime: string;
      endTime: string;
      slot: WeeklyScheduleSlot;
    }
  | {
      kind: 'one-off';
      id: string;
      startTime: string;
      endTime: string;
      lesson: Lesson;
    };

export function buildWeekdayGridItems(
  slots: WeeklyScheduleSlot[],
  oneOffLessons: Lesson[],
): WeekGridItem[] {
  const items: WeekGridItem[] = [
    ...slots.map((slot) => ({
      kind: 'slot' as const,
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      slot,
    })),
    ...oneOffLessons.map((lesson) => ({
      kind: 'one-off' as const,
      id: lesson.id,
      startTime: formatLessonStartTime(lesson.date),
      endTime: lesson.endTime ? normalizeTimeToHm(lesson.endTime) : '',
      lesson,
    })),
  ];

  return items.sort((a, b) => {
    const byStart = a.startTime.localeCompare(b.startTime);
    if (byStart !== 0) return byStart;

    const byEnd = a.endTime.localeCompare(b.endTime);
    if (byEnd !== 0) return byEnd;

    if (a.kind !== b.kind) {
      return a.kind === 'slot' ? -1 : 1;
    }

    return a.id.localeCompare(b.id);
  });
}
