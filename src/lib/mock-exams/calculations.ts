import type {
  MockExam,
  MockExamResult,
  StudentMockExamStats,
  StudentMockExamView,
} from '@/lib/mock-exams/types';

export function calculateScorePercent(score: number, maxScore: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
    return 0;
  }
  return (score / maxScore) * 100;
}

export function formatScorePercent(percent: number, digits = 1): string {
  if (!Number.isFinite(percent)) {
    return '—';
  }
  const fixed = percent.toFixed(digits);
  return `${fixed.replace(/\.0$/, '')}%`;
}

export function formatMockExamDateLabel(examDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDate);
  if (!match) {
    return examDate;
  }

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function sortMockExamsChronologically(exams: MockExam[]): MockExam[] {
  return [...exams].sort((a, b) => {
    if (a.examDate !== b.examDate) {
      return a.examDate.localeCompare(b.examDate);
    }
    const aCreated = a.createdAt ?? '';
    const bCreated = b.createdAt ?? '';
    if (aCreated !== bCreated) {
      return aCreated.localeCompare(bCreated);
    }
    return a.id.localeCompare(b.id);
  });
}

export function buildStudentMockExamViews(
  exams: MockExam[],
  results: MockExamResult[],
): StudentMockExamView[] {
  const scoreByExamId = new Map(
    results.map((result) => [result.mockExamId, result.score] as const),
  );

  return sortMockExamsChronologically(exams)
    .filter((exam) => scoreByExamId.has(exam.id))
    .map((exam) => {
      const score = scoreByExamId.get(exam.id)!;
      return {
        exam,
        score,
        percent: calculateScorePercent(score, exam.maxScore),
      };
    });
}

export function computeStudentMockExamStats(
  views: StudentMockExamView[],
): StudentMockExamStats {
  if (views.length === 0) {
    return {
      count: 0,
      averagePercent: null,
      bestPercent: null,
      latestPercent: null,
    };
  }

  const percents = views.map((view) => view.percent);
  const sum = percents.reduce((total, value) => total + value, 0);

  return {
    count: views.length,
    averagePercent: sum / percents.length,
    bestPercent: Math.max(...percents),
    latestPercent: views[views.length - 1]!.percent,
  };
}

export function computeExamFillStats(
  exam: MockExam,
  results: MockExamResult[],
  studentCount: number,
): {
  filled: number;
  total: number;
  averageScore: number | null;
} {
  const examResults = results.filter((result) => result.mockExamId === exam.id);
  if (examResults.length === 0) {
    return { filled: 0, total: studentCount, averageScore: null };
  }

  const sum = examResults.reduce((total, result) => total + result.score, 0);
  return {
    filled: examResults.length,
    total: studentCount,
    averageScore: sum / examResults.length,
  };
}

export function getHighestScoreForExam(
  examId: string,
  results: MockExamResult[],
): number | null {
  const scores = results
    .filter((result) => result.mockExamId === examId)
    .map((result) => result.score);

  if (scores.length === 0) {
    return null;
  }

  return Math.max(...scores);
}
