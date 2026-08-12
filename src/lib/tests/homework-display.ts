import type { Lesson } from '@/types/tutor';

/** Урок использует новую test-систему (не legacy homework_status). */
export function isNewHomeworkLesson(lesson: Lesson): boolean {
  return Boolean(lesson.lessonTopicId);
}

export function formatLessonHomeworkLabel(lesson: Lesson): string {
  if (isNewHomeworkLesson(lesson)) {
    if (
      lesson.homeworkPointsMax !== undefined &&
      lesson.homeworkPointsEarned !== undefined
    ) {
      const percent =
        lesson.homeworkPercent !== undefined
          ? ` — ${Math.round(lesson.homeworkPercent)}%`
          : '';
      return `ДЗ: ${lesson.homeworkPointsEarned} / ${lesson.homeworkPointsMax}${percent}`;
    }

    if (lesson.status === 'completed' && lesson.attendance === 'present') {
      return 'ДЗ: Назначено';
    }

    return 'ДЗ: —';
  }

  if (lesson.homeworkStatus === 'not_done') {
    return 'ДЗ не сделано';
  }

  if (lesson.homeworkStatus === 'done' && lesson.homeworkScore !== undefined) {
    return `ДЗ: ${lesson.homeworkScore}/10`;
  }

  if (lesson.homeworkStatus === 'partial' && lesson.homeworkScore !== undefined) {
    return `ДЗ частично · ${lesson.homeworkScore}/10`;
  }

  return 'ДЗ: —';
}

export function isLegacyHomeworkNotDone(lesson: Lesson): boolean {
  return (
    !isNewHomeworkLesson(lesson) &&
    lesson.homeworkStatus === 'not_done' &&
    lesson.attendance !== 'absent'
  );
}
