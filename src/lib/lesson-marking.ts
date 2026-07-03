import { isPersistableLessonId } from '@/lib/lessons/persist';
import {
  formatLessonStartTime,
  formatLessonTimeRange,
  getMoscowDateKey,
  lessonStartTimeEquals,
} from '@/lib/lesson-datetime';
import { combineDateAndTime, isLessonOnLocalDate } from '@/lib/lesson-utils';
import type { AssistantTodayItem, Lesson, WeeklyScheduleSlot } from '@/types/tutor';

export function getStartTimeFromTimeLabel(timeLabel: string): string {
  return timeLabel.includes('–') ? timeLabel.split('–')[0] : timeLabel;
}

/** Stable app_id for a slot marking on a given Moscow calendar day (idempotent upsert). */
export function getMaterializedLessonIdForSlot(
  slotId: string,
  studentId: string,
  dateKey: string = getMoscowDateKey(),
): string {
  return `mat-${dateKey}-${slotId}-${studentId}`;
}

export function getMaterializedLessonIdFromSlotItem(
  item: AssistantTodayItem,
): string {
  const dateKey = item.dateKey ?? getMoscowDateKey();

  if (!item.lessonId.startsWith('slot-')) {
    return item.lessonId;
  }

  return `mat-${dateKey}-${item.lessonId.slice('slot-'.length)}`;
}

/** True when a regular slot occurrence already has a persisted or completed lesson. */
export function isSlotOccurrenceMaterialized(
  lessons: Lesson[],
  slot: WeeklyScheduleSlot,
  studentId: string,
  dateKey: string,
): boolean {
  const materializedId = getMaterializedLessonIdForSlot(
    slot.id,
    studentId,
    dateKey,
  );

  if (lessons.some((lesson) => lesson.id === materializedId)) {
    return true;
  }

  const referenceDate = combineDateAndTime(dateKey, slot.startTime);
  const reference: Lesson = {
    id: materializedId,
    studentId,
    date: referenceDate,
    status: 'completed',
    paymentStatus: 'unpaid',
    lessonType: 'regular',
    isOutsideSchedule: false,
    makeupStatus: 'none',
    attendance: 'planned',
  };

  return lessons.some((lesson) => isSameSlotOccurrence(lesson, reference));
}

export function parseSlotItemKey(
  item: AssistantTodayItem,
): { slotId: string; studentId: string } | null {
  if (!item.lessonId.startsWith('slot-')) {
    return null;
  }

  const suffix = item.lessonId.slice('slot-'.length);
  const studentSuffix = `-${item.studentId}`;

  if (!suffix.endsWith(studentSuffix)) {
    return null;
  }

  return {
    slotId: suffix.slice(0, -studentSuffix.length),
    studentId: item.studentId,
  };
}

export function isSameSlotOccurrence(
  completed: Lesson,
  generated: Lesson,
): boolean {
  return (
    completed.studentId === generated.studentId &&
    getMoscowDateKey(completed.date) === getMoscowDateKey(generated.date) &&
    formatLessonStartTime(completed.date) ===
      formatLessonStartTime(generated.date)
  );
}

export function isCompletedLessonForSlotToday(
  lesson: Lesson,
  slot: WeeklyScheduleSlot,
  studentId: string,
): boolean {
  if (lesson.studentId !== studentId || lesson.status !== 'completed') {
    return false;
  }

  if (!isLessonOnLocalDate(lesson.date)) {
    return false;
  }

  const materializedId = getMaterializedLessonIdForSlot(
    slot.id,
    studentId,
    getMoscowDateKey(),
  );

  if (lesson.id === materializedId) {
    return true;
  }

  if (lesson.isOutsideSchedule || lesson.lessonType !== 'regular') {
    return false;
  }

  return lessonStartTimeEquals(lesson.date, slot.startTime);
}

/**
 * Resolves a materialized lesson id after marking from a slot-* placeholder.
 * Falls back to matching today's completed lesson by student, slot and start time.
 */
export function resolveMaterializedLessonId(
  lessonId: string,
  studentId: string,
  timeLabel: string,
  lessons: Lesson[],
): string | null {
  if (isPersistableLessonId(lessonId)) {
    if (lessons.some((lesson) => lesson.id === lessonId)) {
      return lessonId;
    }
  }

  const startTime = getStartTimeFromTimeLabel(timeLabel);
  const matches = lessons.filter(
    (lesson) =>
      lesson.studentId === studentId &&
      lesson.status === 'completed' &&
      isLessonOnLocalDate(lesson.date) &&
      lessonStartTimeEquals(lesson.date, startTime),
  );

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0].id;
  }

  return matches
    .slice()
    .sort((a, b) => b.id.localeCompare(a.id))[0].id;
}

export function findCompletedLessonForSlotItem(
  item: AssistantTodayItem,
  lessons: Lesson[],
  slots: WeeklyScheduleSlot[],
): Lesson | undefined {
  const parsed = parseSlotItemKey(item);
  if (!parsed) {
    return undefined;
  }

  const slot = slots.find((entry) => entry.id === parsed.slotId);
  if (!slot) {
    return undefined;
  }

  const materializedId = getMaterializedLessonIdFromSlotItem(item);

  return lessons.find(
    (lesson) =>
      lesson.id === materializedId ||
      isCompletedLessonForSlotToday(lesson, slot, parsed.studentId),
  );
}

export function completedLessonToMarkedTimeLabel(lesson: Lesson): string {
  if (lesson.endTime) {
    return formatLessonTimeRange(lesson);
  }

  return formatLessonStartTime(lesson.date);
}
