import {
  addDaysToMoscowDateKey,
  getMoscowWeekdayFromDateKey,
} from '@/lib/lesson-datetime';
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

function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
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
  fromDate: Date = getTodayStart(),
  weeksAhead: number = DEFAULT_WEEKS_AHEAD,
): Lesson[] {
  const studentSlots = slots.filter((slot) =>
    slot.studentIds.includes(studentId),
  );

  if (studentSlots.length === 0) return [];

  const lessons: Lesson[] = [];
  const totalDays = weeksAhead * 7;
  const startDateKey = getLocalDateKey(fromDate);

  for (let offset = 0; offset < totalDays; offset++) {
    const dateKey = addDaysToMoscowDateKey(startDateKey, offset);
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

function filterGeneratedFutureCoveredByCompleted(
  generatedFuture: Lesson[],
  completedLessons: Lesson[],
): Lesson[] {
  return generatedFuture.filter(
    (generated) =>
      !generated.id.startsWith('gen-') ||
      !completedLessons.some((completed) =>
        isSameSlotOccurrence(completed, generated),
      ),
  );
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
): StudentLessonView {
  const todayStart = getTodayStart();
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
          new Date(lesson.date).getTime() >= todayStart.getTime(),
      );

  const generatedFuture = isPaused
    ? []
    : filterGeneratedFutureCoveredByCompleted(
        generateFutureLessonsFromSchedule(
          studentId,
          slots,
          todayStart,
          weeksAhead,
        ),
        completedLessons,
      );

  const upcomingLessons = isPaused
    ? []
    : [...generatedFuture, ...oneOffFuture].sort(compareByDateAsc);

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
