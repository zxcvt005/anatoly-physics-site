import { normalizeLesson } from '@/lib/lesson-utils';
import type { AssistantMarkingData, Lesson } from '@/types/tutor';

/** Applies attendance marking to a lesson (present / absent / transfer handled elsewhere). */
export function buildCompletedLessonFromMarking(
  target: Lesson,
  marking: AssistantMarkingData,
): Lesson {
  if (marking.wasPresent) {
    return normalizeLesson({
      ...target,
      status: 'completed',
      attendance: 'present',
      isUnexcusedAbsence: false,
      isChargeable: true,
      paymentStatus: 'paid',
      topic: marking.topic ?? target.topic,
      lessonTopicId: marking.lessonTopicId ?? target.lessonTopicId,
      ...(marking.lessonTopicId
        ? {
            homeworkPointsEarned: undefined,
            homeworkPointsMax: undefined,
            homeworkPercent: undefined,
          }
        : {}),
    });
  }

  const isUnexcusedAbsence = marking.isUnexcusedAbsence === true;

  return normalizeLesson({
    ...target,
    status: 'completed',
    attendance: 'absent',
    isUnexcusedAbsence,
    isChargeable: isUnexcusedAbsence,
    paymentStatus: isUnexcusedAbsence ? 'paid' : target.paymentStatus,
    lessonTopicId: undefined,
    homeworkPointsEarned: undefined,
    homeworkPointsMax: undefined,
    homeworkPercent: undefined,
  });
}
