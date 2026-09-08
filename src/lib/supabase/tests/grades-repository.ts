import 'server-only';

import {
  buildStudentGradesCard,
  type CrmGradeHomeworkItem,
  type CrmStudentGradesCard,
  isStudentInScheduledSet,
  summarizeCompletedHomework,
} from '@/lib/tests/crm-grades';
import { getScheduledStudentIds } from '@/lib/student-admin-filters';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import { fetchScheduleSlotsFromSupabase } from '@/lib/supabase/schedule-slots/repository';
import { fetchCompletedAttemptReviewFromSupabase } from '@/lib/supabase/tests/repository';
import type { CompletedAttemptReview } from '@/lib/tests/attempt-review';
import { buildStudentName } from '@/lib/student-utils';

type GradesRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

function fail(
  error: string,
  status = 400,
): GradesRepositoryResult<never> {
  return { ok: false, error, status };
}

function getClient() {
  return createSupabaseAdminClient();
}

export async function fetchScheduledStudentAppIdsFromSupabase(): Promise<
  GradesRepositoryResult<Set<string>>
> {
  if (!isSupabaseConfiguredOnServer()) {
    return fail('Supabase is not configured', 503);
  }

  const slotsResult = await fetchScheduleSlotsFromSupabase();
  if (!slotsResult.ok) return fail(slotsResult.error);

  return { ok: true, data: getScheduledStudentIds(slotsResult.data) };
}

async function fetchStudentsByAppIds(
  studentAppIds: string[],
): Promise<
  GradesRepositoryResult<Array<{ id: string; name: string; uuid: string }>>
> {
  if (studentAppIds.length === 0) {
    return { ok: true, data: [] };
  }

  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id, app_id, first_name, last_name, name')
    .in('app_id', studentAppIds);

  if (error) return fail(error.message);

  const students = (data ?? []).map((row) => {
    const firstName = String(row.first_name ?? '');
    const lastName = String(row.last_name ?? '');
    const fallbackName = String(row.name ?? '').trim();
    const name =
      buildStudentName(firstName, lastName) || fallbackName || 'Ученик';

    return {
      id: String(row.app_id),
      uuid: String(row.id),
      name,
    };
  });

  return { ok: true, data: students };
}

/**
 * Batch: completed homework attempts for many students in few queries.
 * Dedupes to latest completed attempt per (student, topic) — same as student list.
 */
async function fetchCompletedHomeworkByStudentUuids(
  studentUuidToAppId: Map<string, string>,
): Promise<GradesRepositoryResult<Map<string, CrmGradeHomeworkItem[]>>> {
  const studentUuids = [...studentUuidToAppId.keys()];
  const byStudent = new Map<string, CrmGradeHomeworkItem[]>();

  for (const appId of studentUuidToAppId.values()) {
    byStudent.set(appId, []);
  }

  if (studentUuids.length === 0) {
    return { ok: true, data: byStudent };
  }

  const client = getClient();
  const { data, error } = await client
    .from('test_attempts')
    .select(
      `
      app_id,
      student_id,
      stage,
      completed_at,
      final_score,
      final_max_score,
      final_percent,
      tests!inner (
        app_id,
        test_type,
        lesson_topics (
          app_id,
          title,
          lesson_topic_sections ( title )
        )
      )
    `,
    )
    .in('student_id', studentUuids)
    .eq('stage', 'completed')
    .eq('tests.test_type', 'homework');

  if (error) return fail(error.message);

  type RelationOne<T> = T | T[] | null | undefined;

  function asOne<T>(value: RelationOne<T>): T | null {
    if (!value) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
  }

  type AttemptJoin = {
    app_id: string;
    student_id: string;
    completed_at: string | null;
    final_score: number | null;
    final_max_score: number | null;
    final_percent: number | string | null;
    tests: RelationOne<{
      app_id: string;
      test_type: string;
      lesson_topics: RelationOne<{
        app_id: string;
        title: string;
        lesson_topic_sections: RelationOne<{ title: string }>;
      }>;
    }>;
  };

  const latestByStudentTopic = new Map<
    string,
    Map<string, CrmGradeHomeworkItem>
  >();

  for (const row of (data ?? []) as unknown as AttemptJoin[]) {
    const studentAppId = studentUuidToAppId.get(row.student_id);
    if (!studentAppId) continue;

    const test = asOne(row.tests);
    if (!test || test.test_type !== 'homework') continue;

    const topic = asOne(test.lesson_topics);
    if (!topic?.app_id) continue;

    if (
      row.final_score === null ||
      row.final_max_score === null ||
      row.final_percent === null ||
      row.final_percent === undefined
    ) {
      continue;
    }

    const section = asOne(topic.lesson_topic_sections);

    const item: CrmGradeHomeworkItem = {
      attemptId: row.app_id,
      topicId: topic.app_id,
      topicTitle: topic.title,
      sectionTitle: section?.title,
      completedAt: row.completed_at ?? undefined,
      finalScore: Number(row.final_score),
      finalMaxScore: Number(row.final_max_score),
      finalPercent: Number(row.final_percent),
    };

    let topicMap = latestByStudentTopic.get(studentAppId);
    if (!topicMap) {
      topicMap = new Map();
      latestByStudentTopic.set(studentAppId, topicMap);
    }

    const existing = topicMap.get(item.topicId);
    const itemTime = item.completedAt
      ? new Date(item.completedAt).getTime()
      : 0;
    const existingTime = existing?.completedAt
      ? new Date(existing.completedAt).getTime()
      : 0;

    if (!existing || itemTime >= existingTime) {
      topicMap.set(item.topicId, item);
    }
  }

  for (const [studentAppId, topicMap] of latestByStudentTopic) {
    const items = [...topicMap.values()].sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });
    byStudent.set(studentAppId, items);
  }

  return { ok: true, data: byStudent };
}

export async function fetchCrmGradesOverviewFromSupabase(): Promise<
  GradesRepositoryResult<{ students: CrmStudentGradesCard[] }>
> {
  const scheduledResult = await fetchScheduledStudentAppIdsFromSupabase();
  if (!scheduledResult.ok) return scheduledResult;

  const scheduledIds = [...scheduledResult.data];
  const studentsResult = await fetchStudentsByAppIds(scheduledIds);
  if (!studentsResult.ok) return studentsResult;

  const uuidToAppId = new Map(
    studentsResult.data.map((student) => [student.uuid, student.id]),
  );

  const homeworkResult =
    await fetchCompletedHomeworkByStudentUuids(uuidToAppId);
  if (!homeworkResult.ok) return homeworkResult;

  const students = studentsResult.data
    .map((student) =>
      buildStudentGradesCard({
        studentId: student.id,
        studentName: student.name,
        completed: homeworkResult.data.get(student.id) ?? [],
      }),
    )
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ru'));

  // Include scheduled students missing from DB select (shouldn't happen)
  for (const scheduledId of scheduledIds) {
    if (!students.some((card) => card.studentId === scheduledId)) {
      students.push(
        buildStudentGradesCard({
          studentId: scheduledId,
          studentName: 'Ученик',
          completed: [],
        }),
      );
    }
  }

  return { ok: true, data: { students } };
}

export async function fetchCrmStudentGradesFromSupabase(
  studentAppId: string,
): Promise<
  GradesRepositoryResult<{
    studentId: string;
    studentName: string;
    avgPercent: number | null;
    completedCount: number;
    latestPercent: number | null;
    recentTrend: number[];
    items: CrmGradeHomeworkItem[];
  }>
> {
  const scheduledResult = await fetchScheduledStudentAppIdsFromSupabase();
  if (!scheduledResult.ok) return scheduledResult;

  if (!isStudentInScheduledSet(studentAppId, scheduledResult.data)) {
    return fail('Forbidden', 403);
  }

  const studentsResult = await fetchStudentsByAppIds([studentAppId]);
  if (!studentsResult.ok) return studentsResult;

  const student = studentsResult.data[0];
  if (!student) return fail('Student not found', 404);

  const homeworkResult = await fetchCompletedHomeworkByStudentUuids(
    new Map([[student.uuid, student.id]]),
  );
  if (!homeworkResult.ok) return homeworkResult;

  const items = homeworkResult.data.get(student.id) ?? [];
  const summary = summarizeCompletedHomework(items);

  return {
    ok: true,
    data: {
      studentId: student.id,
      studentName: student.name,
      ...summary,
      items,
    },
  };
}

export async function fetchCrmCompletedAttemptReviewFromSupabase(input: {
  studentAppId: string;
  attemptAppId: string;
}): Promise<GradesRepositoryResult<CompletedAttemptReview>> {
  const scheduledResult = await fetchScheduledStudentAppIdsFromSupabase();
  if (!scheduledResult.ok) return scheduledResult;

  if (!isStudentInScheduledSet(input.studentAppId, scheduledResult.data)) {
    return fail('Forbidden', 403);
  }

  const reviewResult = await fetchCompletedAttemptReviewFromSupabase(input);
  if (!reviewResult.ok) {
    return fail(reviewResult.error, 400);
  }

  return { ok: true, data: reviewResult.data };
}
