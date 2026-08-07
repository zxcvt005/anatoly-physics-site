import {
  addDaysToMoscowDateKey,
  getMoscowDateKey,
  getMoscowWeekdayFromDateKey,
  normalizeDateKeyToDashes,
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
  const minDateKey = normalizeDateKeyToDashes(todayDateKey);

  return lessons.filter((lesson) =>
    isDateKeyOnOrAfter(
      normalizeDateKeyToDashes(getMoscowDateKey(lesson.date)),
      minDateKey,
    ),
  );
}

function compareByDateAsc(a: Lesson, b: Lesson): number {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function compareByDateDesc(a: Lesson, b: Lesson): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

function generateFutureLessonCandidates(
  studentId: string,
  slots: WeeklyScheduleSlot[],
  weeksAhead: number,
  todayDateKey: string,
): Lesson[] {
  const studentSlots = slots.filter((slot) =>
    slot.studentIds.includes(studentId),
  );

  if (studentSlots.length === 0) return [];

  const lessons: Lesson[] = [];
  const totalDays = weeksAhead * 7;
  const normalizedToday = normalizeDateKeyToDashes(todayDateKey);

  for (let offset = 0; offset < totalDays; offset++) {
    const dateKey = addDaysToMoscowDateKey(normalizedToday, offset);
    if (!isDateKeyOnOrAfter(dateKey, normalizedToday)) continue;

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

  return lessons.sort(compareByDateAsc);
}

/** Генерирует будущие regular-занятия из weekly scheduleSlots */
export function generateFutureLessonsFromSchedule(
  studentId: string,
  slots: WeeklyScheduleSlot[],
  weeksAhead: number = DEFAULT_WEEKS_AHEAD,
  todayDateKey: string = getTodayDateKey(),
): Lesson[] {
  return filterUpcomingByMoscowDate(
    generateFutureLessonCandidates(studentId, slots, weeksAhead, todayDateKey),
    normalizeDateKeyToDashes(todayDateKey),
  );
}

function shouldExistingLessonSuppressGeneratedOccurrence(
  existing: Lesson,
  generated: Lesson,
): boolean {
  if (!isSameSlotOccurrence(existing, generated)) {
    return false;
  }

  if (isOrphanScheduledRegularLesson(existing)) {
    return false;
  }

  if (existing.status === 'completed') {
    return true;
  }

  if (existing.status === 'scheduled' && existing.isOutsideSchedule) {
    return true;
  }

  if (existing.id.startsWith('mat-')) {
    return true;
  }

  return false;
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
  const minDateKey = normalizeDateKeyToDashes(todayDateKey);
  const windowEndKey = addDaysToMoscowDateKey(minDateKey, horizonDays);

  return lessons.filter((lesson) => {
    const lessonDateKey = normalizeDateKeyToDashes(getMoscowDateKey(lesson.date));
    if (!lessonDateKey) {
      return false;
    }

    return (
      isDateKeyOnOrAfter(lessonDateKey, minDateKey) &&
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
  const normalizedToday = normalizeDateKeyToDashes(todayDateKey);

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
          isDateKeyOnOrAfter(
            normalizeDateKeyToDashes(getMoscowDateKey(lesson.date)),
            normalizedToday,
          ),
      );

  const generatedFuture = isPaused
    ? []
    : filterGeneratedCoveredByExistingLessons(
        generateFutureLessonsFromSchedule(
          studentId,
          slots,
          weeksAhead,
          normalizedToday,
        ),
        studentLessons,
      );

  const upcomingLessons = isPaused
    ? []
    : filterUpcomingByMoscowDate(
        [...generatedFuture, ...oneOffFuture].sort(compareByDateAsc),
        normalizedToday,
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

export interface StudentLessonViewSnapshot {
  todayDateKey: string;
  todayDateKeyFormat: 'dashed' | 'slashed' | 'invalid';
  studentSlotCount: number;
  studentLessonsCount: number;
  orphanScheduledRegularInSource: number;
  generatedCandidateCount: number;
  generatedAfterBlockCount: number;
  suppressedByExistingCount: number;
  oneOffFutureCount: number;
  upcomingCount: number;
  pastCompletedCount: number;
  firstGeneratedSampleDate: string | null;
  firstGeneratedSampleDateKey: string | null;
  isPaused: boolean;
}

function classifyDateKeyFormat(
  dateKey: string,
): 'dashed' | 'slashed' | 'invalid' {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return 'dashed';
  }

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateKey)) {
    return 'slashed';
  }

  return 'invalid';
}

/** Diagnostic snapshot of the student lesson pipeline before UI rendering. */
export function buildStudentLessonViewSnapshot(
  studentId: string,
  lessons: Lesson[],
  slots: WeeklyScheduleSlot[],
  weeksAhead: number = DEFAULT_WEEKS_AHEAD,
  isPaused = false,
  todayDateKey: string = getTodayDateKey(),
): StudentLessonViewSnapshot {
  const studentLessons = lessons.filter(
    (lesson) => lesson.studentId === studentId,
  );
  const studentSlots = slots.filter((slot) =>
    slot.studentIds.includes(studentId),
  );
  const normalizedToday = normalizeDateKeyToDashes(todayDateKey);

  const generatedCandidates = isPaused
    ? []
    : generateFutureLessonCandidates(
        studentId,
        slots,
        weeksAhead,
        normalizedToday,
      );
  const generatedAfterBlock = isPaused
    ? []
    : filterGeneratedCoveredByExistingLessons(
        generatedCandidates,
        studentLessons,
      );

  const oneOffFuture = isPaused
    ? []
    : studentLessons
        .filter((lesson) => lesson.isOutsideSchedule)
        .filter(
          (lesson) =>
            lesson.status === 'scheduled' &&
            isDateKeyOnOrAfter(getMoscowDateKey(lesson.date), normalizedToday),
        );

  const upcoming = isPaused
    ? []
    : filterUpcomingByMoscowDate(
        [...generatedAfterBlock, ...oneOffFuture].sort(compareByDateAsc),
        normalizedToday,
      );

  const firstGenerated = generatedCandidates[0] ?? null;

  return {
    todayDateKey,
    todayDateKeyFormat: classifyDateKeyFormat(todayDateKey),
    studentSlotCount: studentSlots.length,
    studentLessonsCount: studentLessons.length,
    orphanScheduledRegularInSource: studentLessons.filter(
      isOrphanScheduledRegularLesson,
    ).length,
    generatedCandidateCount: generatedCandidates.length,
    generatedAfterBlockCount: generatedAfterBlock.length,
    suppressedByExistingCount:
      generatedCandidates.length - generatedAfterBlock.length,
    oneOffFutureCount: oneOffFuture.length,
    upcomingCount: upcoming.length,
    pastCompletedCount: studentLessons.filter(
      (lesson) => lesson.status === 'completed',
    ).length,
    firstGeneratedSampleDate: firstGenerated?.date ?? null,
    firstGeneratedSampleDateKey: firstGenerated
      ? getMoscowDateKey(firstGenerated.date)
      : null,
    isPaused,
  };
}
