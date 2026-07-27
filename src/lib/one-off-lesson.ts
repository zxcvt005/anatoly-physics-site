import type { Lesson, OneOffLessonInput } from '@/types/tutor';
import {
  formatLessonStartTime,
  getMoscowDateKey,
  normalizeTimeToHm,
} from '@/lib/lesson-datetime';
import { addOneHourToTime } from '@/lib/crm-time-utils';

export function isEditableOneOffLesson(lesson: Lesson): boolean {
  return lesson.isOutsideSchedule && lesson.status === 'scheduled';
}

export function lessonToOneOffFormValues(lesson: Lesson): {
  lessonKind: OneOffLessonInput['type'];
  studentId: string;
  date: string;
  time: string;
  endTime: string;
  topic: string;
  makeupForLessonId: string;
} {
  const time = normalizeTimeToHm(formatLessonStartTime(lesson.date));
  const endTime = lesson.endTime
    ? normalizeTimeToHm(lesson.endTime)
    : addOneHourToTime(time);

  const lessonKind: OneOffLessonInput['type'] =
    lesson.lessonType === 'extra' ? 'extra' : 'makeup';

  return {
    lessonKind,
    studentId: lesson.studentId,
    date: getMoscowDateKey(lesson.date),
    time,
    endTime,
    topic: lesson.topic ?? '',
    makeupForLessonId: lesson.makeupForLessonId ?? '',
  };
}

export function oneOffInputToLessonPatch(
  existing: Lesson,
  input: OneOffLessonInput,
  combineDateAndTime: (date: string, time: string) => string,
): Partial<Lesson> {
  const lessonType =
    existing.lessonType === 'transfer' ? 'transfer' : input.type;

  return {
    studentId: input.studentId,
    date: combineDateAndTime(input.date, input.time),
    endTime: input.endTime,
    lessonType,
    topic: input.topic,
    comment: input.comment,
    makeupForLessonId:
      lessonType === 'makeup' ? input.makeupForLessonId : undefined,
    makeupStatus: lessonType === 'makeup' ? 'none' : existing.makeupStatus,
    isOutsideSchedule: true,
    status: 'scheduled',
    attendance: 'planned',
    isChargeable: false,
    transferredToLessonId: undefined,
    transferredFromLessonId: undefined,
    transferComment: undefined,
  };
}
