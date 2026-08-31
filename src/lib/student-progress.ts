import { filterLessonsForAcademicStats } from '@/lib/academic-year';
import type { Lesson } from '@/types/tutor';
import {
  hasCompletedHomework,
  isNewHomeworkNotDone,
} from '@/lib/tests/homework-display';

export interface StudentProgressStats {
  attendedLessonsCount: number;
  averageHomeworkPercent: number | null;
  homeworkNotDoneCount: number;
  absencesCount: number;
}

function lessonHomeworkPercent(lesson: Lesson): number | null {
  if (!hasCompletedHomework(lesson)) {
    return null;
  }

  return lesson.homeworkPercent ?? null;
}

export function computeStudentProgressStats(
  lessons: Lesson[],
): StudentProgressStats {
  const academicLessons = filterLessonsForAcademicStats(lessons);
  const completed = academicLessons.filter(
    (lesson) => lesson.status === 'completed',
  );

  const attendedLessonsCount = completed.filter(
    (lesson) =>
      lesson.attendance === 'present' || lesson.attendance === 'late',
  ).length;

  const absencesCount = completed.filter(
    (lesson) => lesson.attendance === 'absent',
  ).length;

  const homeworkNotDoneCount = completed.filter((lesson) =>
    isNewHomeworkNotDone(lesson),
  ).length;

  const homeworkPercents = completed
    .map((lesson) => lessonHomeworkPercent(lesson))
    .filter((percent): percent is number => percent !== null);

  const averageHomeworkPercent =
    homeworkPercents.length > 0
      ? homeworkPercents.reduce((sum, percent) => sum + percent, 0) /
        homeworkPercents.length
      : null;

  return {
    attendedLessonsCount,
    averageHomeworkPercent,
    homeworkNotDoneCount,
    absencesCount,
  };
}

export function formatAverageHomeworkPercent(percent: number | null): string {
  if (percent === null) return 'Пока нет выполненных ДЗ';
  return `${Math.round(percent)}%`;
}
