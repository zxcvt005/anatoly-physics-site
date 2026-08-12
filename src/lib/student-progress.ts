import type { Lesson } from '@/types/tutor';
import { isLegacyHomeworkNotDone, isNewHomeworkLesson } from '@/lib/tests/homework-display';

export interface StudentProgressStats {
  attendedLessonsCount: number;
  averageHomeworkScore: number | null;
  homeworkNotDoneCount: number;
  absencesCount: number;
}

function lessonHomeworkScoreOnTenScale(lesson: Lesson): number | null {
  if (isNewHomeworkLesson(lesson)) {
    if (
      lesson.homeworkPercent !== undefined &&
      lesson.homeworkPointsMax !== undefined
    ) {
      return Math.round((lesson.homeworkPercent / 10) * 10) / 10;
    }
    return null;
  }

  if (lesson.homeworkStatus === 'done' && lesson.homeworkScore !== undefined) {
    return lesson.homeworkScore;
  }

  return null;
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

  const homeworkNotDoneCount = completed.filter((lesson) =>
    isLegacyHomeworkNotDone(lesson),
  ).length;

  const scoredLessons = completed
    .map((lesson) => lessonHomeworkScoreOnTenScale(lesson))
    .filter((score): score is number => score !== null);

  const averageHomeworkScore =
    scoredLessons.length > 0
      ? scoredLessons.reduce((sum, score) => sum + score, 0) / scoredLessons.length
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
