import { crmApiGet } from '@/lib/crm/api/http';
import type {
  CrmGradeHomeworkItem,
  CrmStudentGradesCard,
} from '@/lib/tests/crm-grades';
import type {
  CrmTestStatsDetail,
  CrmTestStatsListItem,
} from '@/lib/tests/crm-test-stats';
import type { CompletedAttemptReview } from '@/lib/tests/attempt-review';

export function fetchCrmGradesOverview() {
  return crmApiGet<{ students: CrmStudentGradesCard[] }>('/api/crm/grades');
}

export function fetchCrmStudentGrades(studentId: string) {
  return crmApiGet<{
    studentId: string;
    studentName: string;
    avgPercent: number | null;
    completedCount: number;
    latestPercent: number | null;
    recentTrend: number[];
    items: CrmGradeHomeworkItem[];
  }>(`/api/crm/grades/${studentId}`);
}

export function fetchCrmAttemptReview(studentId: string, attemptId: string) {
  return crmApiGet<CompletedAttemptReview>(
    `/api/crm/grades/${studentId}/attempts/${attemptId}`,
  );
}

export function fetchCrmTestStatsList() {
  return crmApiGet<{ tests: CrmTestStatsListItem[] }>('/api/crm/grades/tests');
}

export function fetchCrmTestStatsDetail(testId: string) {
  return crmApiGet<CrmTestStatsDetail>(`/api/crm/grades/tests/${testId}`);
}
