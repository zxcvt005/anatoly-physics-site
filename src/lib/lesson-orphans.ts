import type { Lesson } from '@/types/tutor';

/**
 * Регулярное занятие в статусе scheduled, сохранённое в lessons.
 * В текущей архитектуре будущие regular строятся виртуально (gen-*) из слотов,
 * а «сегодня» ассистентка материализует урок из slot-* при отметке.
 * Такие записи — наследие старой модели и дублируют слоты.
 */
export function isScheduledRegularLesson(lesson: Lesson): boolean {
  return (
    lesson.status === 'scheduled' &&
    !lesson.isOutsideSchedule &&
    (lesson.lessonType ?? 'regular') === 'regular'
  );
}

export function isOrphanScheduledRegularLesson(lesson: Lesson): boolean {
  return isScheduledRegularLesson(lesson);
}

export function pruneOrphanScheduledRegularLessons(lessons: Lesson[]): Lesson[] {
  return lessons.filter((lesson) => !isOrphanScheduledRegularLesson(lesson));
}
