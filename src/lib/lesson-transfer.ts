import {
  formatLessonDateInMoscow,
  formatLessonStartTime,
} from '@/lib/lesson-datetime';
import { isOrphanScheduledRegularLesson } from '@/lib/lesson-orphans';
import { combineDateAndTime, generateLessonId, normalizeLesson } from '@/lib/lesson-utils';
import type { Lesson, TransferLessonInput } from '@/types/tutor';

export function canTransferLesson(lesson: Lesson): boolean {
  return lesson.status === 'scheduled' && lesson.attendance !== 'transferred';
}

const TRANSFER_PICKER_HOURS = 48;

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Занятия для списка переноса в админке: сейчас → +48 ч, только ещё не начавшиеся */
export function isLessonInTransferPickerWindow(
  lesson: Lesson,
  now: Date = new Date(),
): boolean {
  if (!canTransferLesson(lesson)) return false;

  const lessonStart = new Date(lesson.date);
  const nowMs = now.getTime();
  const horizonMs = nowMs + TRANSFER_PICKER_HOURS * 60 * 60 * 1000;

  if (lessonStart.getTime() <= nowMs) return false;
  if (lessonStart.getTime() > horizonMs) return false;

  const todayKey = toLocalDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = toLocalDateKey(tomorrow);
  const dayAfter = new Date(now);
  dayAfter.setDate(now.getDate() + 2);
  const dayAfterKey = toLocalDateKey(dayAfter);
  const lessonKey = toLocalDateKey(lessonStart);

  if (lessonKey === todayKey) {
    return lessonStart.getTime() > nowMs;
  }

  if (lessonKey === tomorrowKey || lessonKey === dayAfterKey) {
    return true;
  }

  return false;
}

export function getTransferPickerLessons(
  lessons: Lesson[],
  now: Date = new Date(),
): Lesson[] {
  return lessons
    .filter(
      (lesson) =>
        isLessonInTransferPickerWindow(lesson, now) &&
        !isOrphanScheduledRegularLesson(lesson),
    )
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
}

export function applyTransferToLessons(
  lessons: Lesson[],
  sourceLessonId: string,
  input: TransferLessonInput,
): Lesson[] {
  const source = lessons.find((lesson) => lesson.id === sourceLessonId);
  if (!source) return lessons;

  const newLesson = normalizeLesson({
    id: generateLessonId(),
    studentId: source.studentId,
    date: combineDateAndTime(input.date, input.time),
    status: 'scheduled',
    paymentStatus: 'unpaid',
    lessonType: 'transfer',
    isOutsideSchedule: true,
    transferredFromLessonId: sourceLessonId,
    endTime: input.endTime,
    comment: input.comment,
    topic: source.topic,
    attendance: 'planned',
    isChargeable: false,
    makeupStatus: 'none',
  });

  const completedSource = normalizeLesson({
    ...source,
    status: 'completed',
    attendance: 'transferred',
    isChargeable: false,
    transferredToLessonId: newLesson.id,
    transferComment: input.comment,
    paymentStatus: source.paymentStatus,
  });

  return lessons
    .map((lesson) => (lesson.id === sourceLessonId ? completedSource : lesson))
    .concat(newLesson);
}

export function formatTransferTargetLabel(
  targetLesson: Lesson | undefined,
): string | null {
  if (!targetLesson) return null;

  const formatted = formatLessonDateInMoscow(targetLesson.date, {
    day: 'numeric',
    month: 'long',
  });
  const time = formatLessonStartTime(targetLesson.date);

  return `${formatted}, ${time}`;
}
