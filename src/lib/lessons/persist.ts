import type { Lesson } from '@/types/tutor';

/** Virtual lessons must never be written to Supabase. */
export function isPersistableLessonId(lessonId: string): boolean {
  return !lessonId.startsWith('gen-') && !lessonId.startsWith('slot-');
}

export function isPersistableLesson(lesson: Lesson): boolean {
  return isPersistableLessonId(lesson.id);
}

export function filterPersistableLessons(lessons: Lesson[]): Lesson[] {
  return lessons.filter(isPersistableLesson);
}

/** Topological order: referenced lesson app_ids are upserted first. */
export function sortLessonsForUpsert(lessons: Lesson[]): Lesson[] {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const visited = new Set<string>();
  const result: Lesson[] = [];

  function visit(lesson: Lesson) {
    if (visited.has(lesson.id)) {
      return;
    }

    if (
      lesson.transferredToLessonId &&
      byId.has(lesson.transferredToLessonId)
    ) {
      visit(byId.get(lesson.transferredToLessonId)!);
    }

    visited.add(lesson.id);
    result.push(lesson);
  }

  for (const lesson of lessons) {
    visit(lesson);
  }

  return result;
}

export function collectChangedPersistableLessons(
  before: Lesson[],
  after: Lesson[],
): Lesson[] {
  const beforeMap = new Map(
    filterPersistableLessons(before).map((lesson) => [lesson.id, lesson]),
  );
  const changed: Lesson[] = [];

  for (const lesson of filterPersistableLessons(after)) {
    const previous = beforeMap.get(lesson.id);

    if (!previous) {
      changed.push(lesson);
      continue;
    }

    if (JSON.stringify(previous) !== JSON.stringify(lesson)) {
      changed.push(lesson);
    }
  }

  return sortLessonsForUpsert(changed);
}
