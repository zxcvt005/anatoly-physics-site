import type { Lesson } from '@/types/tutor';

/** Урок использует новую test-систему (не legacy homework_status). */
export function isNewHomeworkLesson(lesson: Lesson): boolean {
  return Boolean(lesson.lessonTopicId);
}

/** Завершённое ДЗ новой системы (snapshot на уроке после completed attempt). */
export function hasCompletedHomework(lesson: Lesson): boolean {
  return (
    isNewHomeworkLesson(lesson) &&
    lesson.homeworkPercent !== undefined &&
    lesson.homeworkPointsMax !== undefined &&
    lesson.homeworkPointsEarned !== undefined
  );
}

export function formatLessonHomeworkLabel(lesson: Lesson): string {
  if (isNewHomeworkLesson(lesson)) {
    if (hasCompletedHomework(lesson)) {
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

  return 'ДЗ: —';
}

/** Назначено, но ещё не выполнено (только новая test-система). */
export function isNewHomeworkNotDone(lesson: Lesson): boolean {
  return (
    isNewHomeworkLesson(lesson) &&
    lesson.status === 'completed' &&
    lesson.attendance !== 'absent' &&
    lesson.attendance !== 'transferred' &&
    !hasCompletedHomework(lesson)
  );
}

/** @deprecated Legacy homework_status больше не используется в метриках. */
export function isLegacyHomeworkNotDone(_lesson: Lesson): boolean {
  return false;
}
