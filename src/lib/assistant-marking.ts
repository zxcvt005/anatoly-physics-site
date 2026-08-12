import {
  completedLessonToMarkedTimeLabel,
  findCompletedLessonForSlotItem,
  getMaterializedLessonIdFromSlotItem,
  getStartTimeFromTimeLabel,
  isSlotOccurrenceMaterialized,
} from '@/lib/lesson-marking';
import {
  addDaysToMoscowDateKey,
  formatLessonStartTime,
  formatLessonTimeRange,
  getMoscowDateKey,
  getMoscowWeekdayFromDateKey,
} from '@/lib/lesson-datetime';
import { isOrphanScheduledRegularLesson } from '@/lib/lesson-orphans';
import {
  combineDateAndTime,
  getLocalDateKey,
  isLessonOnLocalDate,
} from '@/lib/lesson-utils';
import { slotMatchesWeekday } from '@/lib/schedule-utils';
import {
  formatDateShort,
  formatTimeRange,
  WEEKDAY_LABELS,
} from '@/lib/tutor-calculations';
import {
  getUnmarkedLowerBoundForSlotStudent,
  getUnmarkedLowerBoundForStudent,
  isDateWithinUnmarkedPastWindow,
  UNMARKED_PAST_DAYS,
} from '@/lib/unmarked-past-bounds';
import type {
  AssistantMarkedEntry,
  AssistantMarkingData,
  AssistantTodayItem,
  AssistantUnmarkedItem,
  Lesson,
  Student,
  WeeklyScheduleSlot,
} from '@/types/tutor';

export { UNMARKED_PAST_DAYS };

export function buildTodayMarkingItemsFromLessons(
  lessons: Lesson[],
  pausedStudentIds?: Set<string>,
): AssistantTodayItem[] {
  return lessons
    .filter(
      (lesson) =>
        isLessonOnLocalDate(lesson.date) &&
        lesson.status === 'scheduled' &&
        !isOrphanScheduledRegularLesson(lesson) &&
        !pausedStudentIds?.has(lesson.studentId),
    )
    .map((lesson) => ({
      id: lesson.id,
      lessonId: lesson.id,
      studentId: lesson.studentId,
      timeLabel: formatLessonStartTime(lesson.date),
      lessonType: lesson.lessonType,
      isOutsideSchedule: lesson.isOutsideSchedule,
    }))
    .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
}

export interface TodayScheduleSlotCard {
  id: string;
  timeLabel: string;
  startTime: string;
  endTime: string;
  studentIds: string[];
  itemIds: string[];
  markedCount: number;
  totalCount: number;
  isPast: boolean;
  isOutsideSchedule?: boolean;
}

function isTimeInRange(time: string, start: string, end: string): boolean {
  return time >= start && time < end;
}

function isSlotPast(endTime: string, now = new Date()): boolean {
  const [hours, minutes] = endTime.split(':').map(Number);
  const slotEnd = new Date(now);
  slotEnd.setHours(hours, minutes, 0, 0);
  return now > slotEnd;
}

function itemBelongsToSlot(
  item: AssistantTodayItem,
  slot: WeeklyScheduleSlot,
): boolean {
  if (item.id.startsWith(`slot-${slot.id}-`)) return true;
  if (!slot.studentIds.includes(item.studentId)) return false;

  if (item.timeLabel.includes('–')) {
    return item.timeLabel === formatTimeRange(slot.startTime, slot.endTime);
  }

  return isTimeInRange(item.timeLabel, slot.startTime, slot.endTime);
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + minutesToAdd;
  const nextHours = Math.floor(total / 60) % 24;
  const nextMinutes = total % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

export function buildTodayScheduleCards(
  slots: WeeklyScheduleSlot[],
  weekday: number,
  todayItems: AssistantTodayItem[],
  markedItemIds: Set<string>,
): TodayScheduleSlotCard[] {
  const todaySlots = slots
    .filter((slot) => slotMatchesWeekday(slot, weekday))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const assignedItemIds = new Set<string>();
  const cards: TodayScheduleSlotCard[] = [];

  for (const slot of todaySlots) {
    const slotItems = todayItems.filter((item) => {
      if (assignedItemIds.has(item.id)) return false;
      return itemBelongsToSlot(item, slot);
    });

    for (const item of slotItems) {
      assignedItemIds.add(item.id);
    }

    const studentIds =
      slotItems.length > 0
        ? [...new Set(slotItems.map((item) => item.studentId))]
        : slot.studentIds;

    const markedCount = slotItems.filter((item) =>
      markedItemIds.has(item.id),
    ).length;

    cards.push({
      id: slot.id,
      timeLabel: formatTimeRange(slot.startTime, slot.endTime),
      startTime: slot.startTime,
      endTime: slot.endTime,
      studentIds,
      itemIds: slotItems.map((item) => item.id),
      markedCount,
      totalCount: Math.max(studentIds.length, slotItems.length),
      isPast: isSlotPast(slot.endTime),
    });
  }

  const orphanItems = todayItems.filter((item) => !assignedItemIds.has(item.id));

  for (const item of orphanItems) {
    const startTime = item.timeLabel.includes('–')
      ? item.timeLabel.split('–')[0]
      : item.timeLabel;
    const endTime = item.timeLabel.includes('–')
      ? item.timeLabel.split('–')[1]
      : addMinutesToTime(startTime, 60);

    cards.push({
      id: `oneoff-${item.id}`,
      timeLabel: item.timeLabel.includes('–')
        ? item.timeLabel
        : `${startTime}–${endTime}`,
      startTime,
      endTime,
      studentIds: [item.studentId],
      itemIds: [item.id],
      markedCount: markedItemIds.has(item.id) ? 1 : 0,
      totalCount: 1,
      isPast: isSlotPast(endTime),
      isOutsideSchedule: item.isOutsideSchedule,
    });
  }

  return cards.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function buildTodayMarkingItems(
  slots: WeeklyScheduleSlot[],
  weekday: number,
  lessons: Lesson[],
  pausedStudentIds?: Set<string>,
): AssistantTodayItem[] {
  const fromLessons = buildTodayMarkingItemsFromLessons(
    lessons,
    pausedStudentIds,
  );
  const slotItems: AssistantTodayItem[] = [];

  for (const slot of slots) {
    if (!slotMatchesWeekday(slot, weekday)) continue;

    for (const studentId of slot.studentIds) {
      const hasLessonForSlot = fromLessons.some(
        (item) =>
          item.studentId === studentId && itemBelongsToSlot(item, slot),
      );
      if (hasLessonForSlot) continue;
      if (pausedStudentIds?.has(studentId)) continue;

      slotItems.push({
        id: `slot-${slot.id}-${studentId}`,
        lessonId: `slot-${slot.id}-${studentId}`,
        studentId,
        timeLabel: formatTimeRange(slot.startTime, slot.endTime),
        lessonType: 'regular',
        isOutsideSchedule: false,
      });
    }
  }

  return [...fromLessons, ...slotItems].sort((a, b) =>
    a.timeLabel.localeCompare(b.timeLabel),
  );
}

function isWithinUnmarkedPastWindow(
  dateKey: string,
  todayDateKey: string,
  lowerBoundDateKey: string,
): boolean {
  return isDateWithinUnmarkedPastWindow(
    dateKey,
    todayDateKey,
    lowerBoundDateKey,
  );
}

/** Past regular slots and retro one-offs that still need attendance marking. */
export function buildUnmarkedPastItems(
  slots: WeeklyScheduleSlot[],
  lessons: Lesson[],
  students: Student[],
  pausedStudentIds?: Set<string>,
  todayDateKey: string = getLocalDateKey(),
): AssistantUnmarkedItem[] {
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const items: AssistantUnmarkedItem[] = [];

  for (let dayOffset = 1; dayOffset <= UNMARKED_PAST_DAYS; dayOffset++) {
    const dateKey = addDaysToMoscowDateKey(todayDateKey, -dayOffset);
    const weekday = getMoscowWeekdayFromDateKey(dateKey);

    for (const slot of slots) {
      if (!slotMatchesWeekday(slot, weekday)) continue;

      for (const studentId of slot.studentIds) {
        if (pausedStudentIds?.has(studentId)) continue;

        const student = studentsById.get(studentId);
        const lowerBound = getUnmarkedLowerBoundForSlotStudent(
          slot,
          studentId,
          student,
          todayDateKey,
        );

        if (!isWithinUnmarkedPastWindow(dateKey, todayDateKey, lowerBound)) {
          continue;
        }

        if (isSlotOccurrenceMaterialized(lessons, slot, studentId, dateKey)) {
          continue;
        }

        const lessonDate = combineDateAndTime(dateKey, slot.startTime);

        items.push({
          id: `past-slot-${dateKey}-${slot.id}-${studentId}`,
          lessonId: `slot-${slot.id}-${studentId}`,
          studentId,
          dateKey,
          dateLabel: formatDateShort(lessonDate),
          weekdayLabel: WEEKDAY_LABELS[weekday],
          timeLabel: formatTimeRange(slot.startTime, slot.endTime),
          lessonType: 'regular',
          isOutsideSchedule: false,
          source: 'regular-slot',
        });
      }
    }
  }

  for (const lesson of lessons) {
    if (!lesson.isOutsideSchedule || lesson.status !== 'scheduled') continue;

    const dateKey = getMoscowDateKey(lesson.date);
    const student = studentsById.get(lesson.studentId);
    const lowerBound = getUnmarkedLowerBoundForStudent(student, todayDateKey);

    if (!isWithinUnmarkedPastWindow(dateKey, todayDateKey, lowerBound)) continue;
    if (pausedStudentIds?.has(lesson.studentId)) continue;

    const weekday = getMoscowWeekdayFromDateKey(dateKey);

    items.push({
      id: `past-oneoff-${lesson.id}`,
      lessonId: lesson.id,
      studentId: lesson.studentId,
      dateKey,
      dateLabel: formatDateShort(lesson.date),
      weekdayLabel: WEEKDAY_LABELS[weekday],
      timeLabel: lesson.endTime
        ? formatLessonTimeRange(lesson)
        : formatLessonStartTime(lesson.date),
      lessonType: lesson.lessonType,
      isOutsideSchedule: true,
      source: 'one-off',
    });
  }

  return items.sort((a, b) => {
    const dateCompare = b.dateKey.localeCompare(a.dateKey);
    if (dateCompare !== 0) return dateCompare;
    return a.timeLabel.localeCompare(b.timeLabel);
  });
}

export function completedTodayToMarkedEntries(
  lessons: Lesson[],
): AssistantMarkedEntry[] {
  return lessons
    .filter(
      (lesson) =>
        isLessonOnLocalDate(lesson.date) && lesson.status === 'completed',
    )
    .map((lesson) => ({
      id: `today-${lesson.id}`,
      lessonId: lesson.id,
      studentId: lesson.studentId,
      timeLabel: completedLessonToMarkedTimeLabel(lesson),
      dateLabel: formatDateShort(lesson.date),
      source: 'today' as const,
      marking: lessonToMarkingData(lesson),
      markedAt: lesson.date,
    }))
    .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
}

export function matchCompletedEntryToTodayItem(
  entry: AssistantMarkedEntry,
  item: AssistantTodayItem,
  lessons: Lesson[],
  slots: WeeklyScheduleSlot[],
): boolean {
  if (entry.lessonId === item.lessonId) {
    return true;
  }

  if (!item.lessonId.startsWith('slot-')) {
    return false;
  }

  const materializedId = getMaterializedLessonIdFromSlotItem(item);
  if (entry.lessonId === materializedId) {
    return true;
  }

  const completed = findCompletedLessonForSlotItem(item, lessons, slots);
  if (completed && entry.lessonId === completed.id) {
    return true;
  }

  if (entry.studentId !== item.studentId) {
    return false;
  }

  return (
    getStartTimeFromTimeLabel(entry.timeLabel) ===
    getStartTimeFromTimeLabel(item.timeLabel)
  );
}

export function lessonToMarkingData(lesson: Lesson): AssistantMarkingData {
  if (lesson.attendance === 'transferred') {
    return {
      wasPresent: false,
      isTransferred: true,
    };
  }

  const wasPresent =
    lesson.attendance === 'present' || lesson.attendance === 'late';
  return {
    wasPresent,
    topic: lesson.topic,
    lessonTopicId: lesson.lessonTopicId,
  };
}

export function buildHistoryFromLessons(lessons: Lesson[]): AssistantMarkedEntry[] {
  return lessons
    .filter((lesson) => lesson.status === 'completed')
    .map((lesson) => ({
      id: `history-${lesson.id}`,
      lessonId: lesson.id,
      studentId: lesson.studentId,
      timeLabel: completedLessonToMarkedTimeLabel(lesson),
      dateLabel: formatDateShort(lesson.date),
      source: 'history' as const,
      marking: lessonToMarkingData(lesson),
      markedAt: lesson.date,
    }))
    .sort(
      (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime(),
    );
}

export function todayItemToMarkedEntry(
  item: AssistantTodayItem,
  marking: AssistantMarkingData,
): AssistantMarkedEntry {
  const today = new Date();

  return {
    id: `today-${item.id}`,
    lessonId: item.lessonId,
    studentId: item.studentId,
    timeLabel: item.timeLabel,
    dateLabel: today.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    }),
    source: 'today',
    marking,
    markedAt: today.toISOString(),
  };
}
