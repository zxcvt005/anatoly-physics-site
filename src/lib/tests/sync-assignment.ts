import type { AssistantMarkingData } from '@/types/tutor';
import { createLessonHomeworkAssignment } from '@/lib/crm/api/tests';

export async function syncHomeworkAssignmentAfterMarking(
  lessonId: string,
  studentId: string,
  marking: AssistantMarkingData,
) {
  if (!marking.wasPresent || !marking.lessonTopicId) {
    return;
  }

  if (lessonId.startsWith('slot-') || lessonId.startsWith('gen-')) {
    return;
  }

  await createLessonHomeworkAssignment({
    studentId,
    lessonId,
    topicId: marking.lessonTopicId,
  });
}
