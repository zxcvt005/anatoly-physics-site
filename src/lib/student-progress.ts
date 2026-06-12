import type { Lesson } from '@/types/tutor';

export interface StudentProgressStats {
  attendedLessonsCount: number;
  averageHomeworkScore: number | null;
  homeworkNotDoneCount: number;
  absencesCount: number;
}

export function computeStudentProgressStats(
  lessons: Lesson[],
): StudentProgressStats {
  const completed = lessons.filter((lesson) => lesson.status === 'completed');

  const attendedLessonsCount = completed.filter(
    (lesson) =>
      lesson.attendance === 'present' || lesson.attendance === 'late',
  ).length;

  const absencesCount = completed.filter(
    (lesson) => lesson.attendance === 'absent',
  ).length;

  const homeworkNotDoneCount = completed.filter(
    (lesson) =>
      lesson.attendance !== 'absent' && lesson.homeworkStatus === 'not_done',
  ).length;

  const scoredLessons = completed.filter(
    (lesson) =>
      lesson.homeworkStatus === 'done' && lesson.homeworkScore !== undefined,
  );

  const averageHomeworkScore =
    scoredLessons.length > 0
      ? scoredLessons.reduce(
          (sum, lesson) => sum + (lesson.homeworkScore ?? 0),
          0,
        ) / scoredLessons.length
      : null;

  return {
    attendedLessonsCount,
    averageHomeworkScore,
    homeworkNotDoneCount,
    absencesCount,
  };
}

export function formatAverageHomeworkScore(score: number | null): string {
  if (score === null) return 'Пока нет данных';
  const rounded = Math.round(score * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
