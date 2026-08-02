import {
  addDaysToMoscowDateKey,
  getMoscowDateKey,
  getMoscowWeekdayFromDateKey,
} from '@/lib/lesson-datetime';
import { isOrphanScheduledRegularLesson } from '@/lib/lesson-orphans';
import { isSameSlotOccurrence } from '@/lib/lesson-marking';
import {
  combineDateAndTime,
  getLocalDateKey,
  normalizeLesson,
} from '@/lib/lesson-utils';
import { slotMatchesWeekday } from '@/lib/schedule-utils';
import type { Lesson, WeeklyScheduleSlot } from '@/types/tutor';

const DEFAULT_WEEKS_AHEAD = 16;

export interface StudentLessonView {
  /** Прошедшие проведённые занятия (не пересчитываются) */
  pastLessons: Lesson[];
  /** Будущие: из актуального расписания + разовые из lessons */
  upcomingLessons: Lesson[];
  /** Для календаря: прошедшие + будущие */
  calendarLessons: Lesson[];
  /** Для очереди оплат: completed + будущие */
  paymentLessons: Lesson[];
  /** Все уроки ученика для ссылок (makeup и т.д.) */
  allLessons: Lesson[];
}

function getTodayDateKey(): string {
  return getMoscowDateKey();
}

function isDateKeyOnOrAfter(dateKey: string, minDateKey: string): boolean {
  return dateKey >= minDateKey;
}

/** Будущие/сегодняшние занятия по московскому календарю (не по UTC-префиксу ISO). */
export function filterUpcomingByMoscowDate(
  lessons: Lesson[],
  todayDateKey: string,
): Lesson[] {
  return lessons.filter((lesson) =>
    isDateKeyOnOrAfter(getMoscowDateKey(lesson.date), todayDateKey),
  );
}

function compareByDateAsc(a: Lesson, b: Lesson): number {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function compareByDateDesc(a: Lesson, b: Lesson): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

/** Генерирует будущие regular-занятия из weekly scheduleSlots */
export function generateFutureLessonsFromSchedule(
  studentId: string,
  slots: WeeklyScheduleSlot[],
  weeksAhead: number = DEFAULT_WEEKS_AHEAD,
  todayDateKey: string = getTodayDateKey(),
): Lesson[] {
  const studentSlots = slots.filter((slot) =>
    slot.studentIds.includes(studentId),
  );

  if (studentSlots.length === 0) return [];

  const lessons: Lesson[] = [];
  const totalDays = weeksAhead * 7;

  for (let offset = 0; offset < totalDays; offset++) {
    const dateKey = addDaysToMoscowDateKey(todayDateKey, offset);
    if (!isDateKeyOnOrAfter(dateKey, todayDateKey)) continue;

    const weekday = getMoscowWeekdayFromDateKey(dateKey);

    for (const slot of studentSlots) {
      if (!slotMatchesWeekday(slot, weekday)) continue;

      lessons.push(
        normalizeLesson({
          id: `gen-${studentId}-${slot.id}-${dateKey}`,
          studentId,
          date: combineDateAndTime(dateKey, slot.startTime),
          status: 'scheduled',
          paymentStatus: 'unpaid',
          lessonType: 'regular',
          isOutsideSchedule: false,
          makeupStatus: 'none',
          attendance: 'planned',
          topic: slot.comment,
          endTime: slot.endTime,
        }),
      );
    }
  }

  return filterUpcomingByMoscowDate(
    lessons.sort(compareByDateAsc),
    todayDateKey,
  );
}

function shouldExistingLessonSuppressGeneratedOccurrence(
  existing: Lesson,
  generated: Lesson,
): boolean {
  if (!isSameSlotOccurrence(existing, generated)) {
    return false;
  }

  // Legacy scheduled regular rows duplicate virtual gen-* occurrences and are
  // not shown in upcomingLessons — they must not hide regenerated schedule.
  if (isOrphanScheduledRegularLesson(existing)) {
    return false;
  }

  return true;
}

function filterGeneratedCoveredByExistingLessons(
  generatedFuture: Lesson[],
  existingLessons: Lesson[],
): Lesson[] {
  return generatedFuture.filter(
    (generated) =>
      !existingLessons.some((existing) =>
        shouldExistingLessonSuppressGeneratedOccurrence(existing, generated),
      ),
  );
}

/** 14-day Moscow window for the «Будущие занятия» list in the student cabinet. */
export const UPCOMING_LIST_HORIZON_DAYS = 14;

export function filterLessonsForUpcomingListByMoscow(
  lessons: Lesson[],
  todayDateKey: string = getTodayDateKey(),
  horizonDays: number = UPCOMING_LIST_HORIZON_DAYS,
): Lesson[] {
  const windowEndKey = addDaysToMoscowDateKey(todayDateKey, horizonDays);

  return lessons.filter((lesson) => {
    const lessonDateKey = getMoscowDateKey(lesson.date);
    if (!lessonDateKey) {
      return false;
    }

    return (
      isDateKeyOnOrAfter(lessonDateKey, todayDateKey) &&
      lessonDateKey <= windowEndKey
    );
  });
}

/**
 * Собирает представление занятий ученика:
 * - прошлое из lessons (completed), без пересчёта;
 * - будущее regular — из актуального scheduleSlots;
 * - разовые (isOutsideSchedule) — из lessons как есть.
 */
export function buildStudentLessonView(
  studentId: string,
  lessons: Lesson[],
  slots: WeeklyScheduleSlot[],
  weeksAhead: number = DEFAULT_WEEKS_AHEAD,
  isPaused = false,
  todayDateKey: string = getTodayDateKey(),
): StudentLessonView {
  const studentLessons = lessons.filter(
    (lesson) => lesson.studentId === studentId,
  );

  const completedLessons = studentLessons
    .filter((lesson) => lesson.status === 'completed')
    .map(normalizeLesson);

  const oneOffLessons = studentLessons
    .filter((lesson) => lesson.isOutsideSchedule)
    .map(normalizeLesson);

  const oneOffFuture = isPaused
    ? []
    : oneOffLessons.filter(
        (lesson) =>
          lesson.status === 'scheduled' &&
          isDateKeyOnOrAfter(getMoscowDateKey(lesson.date), todayDateKey),
      );

  const generatedFuture = isPaused
    ? []
    : filterGeneratedCoveredByExistingLessons(
        generateFutureLessonsFromSchedule(
          studentId,
          slots,
          weeksAhead,
          todayDateKey,
        ),
        studentLessons,
      );

  const upcomingLessons = isPaused
    ? []
    : filterUpcomingByMoscowDate(
        [...generatedFuture, ...oneOffFuture].sort(compareByDateAsc),
        todayDateKey,
      );

  const pastLessons = [...completedLessons].sort(compareByDateDesc);

  const calendarLessons = [...completedLessons, ...upcomingLessons].sort(
    compareByDateAsc,
  );

  const paymentLessons = [...completedLessons, ...upcomingLessons].sort(
    compareByDateAsc,
  );

  const allLessons = [
    ...completedLessons,
    ...oneOffLessons.filter((l) => l.status === 'completed'),
    ...upcomingLessons,
  ].sort(compareByDateAsc);

  return {
    pastLessons,
    upcomingLessons,
    calendarLessons,
    paymentLessons,
    allLessons,
  };
}

/** Локальная проверка генерации: today=2026-06-12, пн/чт → с 2026-06-15, без 2026-06-11. */
export function verifyScheduleLessonsGeneration(): string[] {
  const errors: string[] = [];
  const studentId = 'verify-student';
  const slots: WeeklyScheduleSlot[] = [
    {
      id: 'slot-mon',
      weekday: 1,
      startTime: '10:00',
      endTime: '11:00',
      studentIds: [studentId],
    },
    {
      id: 'slot-thu',
      weekday: 4,
      startTime: '10:00',
      endTime: '11:00',
      studentIds: [studentId],
    },
  ];
  const today = '2026-06-12';
  const generated = generateFutureLessonsFromSchedule(
    studentId,
    slots,
    16,
    today,
  );
  const dateKeys = generated.map((lesson) => getMoscowDateKey(lesson.date));

  if (dateKeys.includes('2026-06-11')) {
    errors.push('2026-06-11 must not be generated when today is 2026-06-12');
  }

  if (dateKeys[0] !== '2026-06-15') {
    errors.push(
      `First generated date must be 2026-06-15, got ${dateKeys[0] ?? 'none'}`,
    );
  }

  const view = buildStudentLessonView(studentId, [], slots, 16, false, today);
  const upcomingKeys = view.upcomingLessons.map((lesson) =>
    getMoscowDateKey(lesson.date),
  );

  if (upcomingKeys.includes('2026-06-11')) {
    errors.push('2026-06-11 must not appear in upcomingLessons');
  }

  if (upcomingKeys[0] !== '2026-06-15') {
    errors.push(
      `First upcoming date must be 2026-06-15, got ${upcomingKeys[0] ?? 'none'}`,
    );
  }

  return errors;
}
