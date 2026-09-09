import 'server-only';

import { startCrmOperationTimer } from '@/lib/crm/diagnostics/log-failure.server';
import type {
  MockExam,
  MockExamInput,
  MockExamResult,
  MockExamsBundle,
  MockExamUpdateInput,
} from '@/lib/mock-exams/types';
import {
  generateMockExamResultId,
  validateMockExamInput,
  validateMockExamUpdate,
  validateScoreInput,
} from '@/lib/mock-exams/validation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import {
  logRepositoryFailure,
  logSupabaseQueryFailure,
} from '@/lib/supabase/log-query-failure.server';
import {
  mapMockExamResultRows,
  mapMockExamRow,
  mapMockExamRows,
  mockExamToInsertRow,
} from '@/lib/supabase/mock-exams/mappers';
import type {
  MockExamResultWithAppIdsRow,
  MockExamRow,
  MockExamsRepositoryResult,
} from '@/lib/supabase/mock-exams/types';

const RESULT_SELECT = `
  id,
  app_id,
  score,
  created_at,
  updated_at,
  students (
    app_id
  ),
  mock_exams (
    app_id
  )
`;

function getClient() {
  return createSupabaseAdminClient();
}

async function resolveStudentUuid(
  studentAppId: string,
): Promise<MockExamsRepositoryResult<string>> {
  const client = getClient();
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('app_id', studentAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: `Student not found: ${studentAppId}` };
  }
  return { ok: true, data: data.id };
}

async function resolveMockExamUuid(
  mockExamAppId: string,
): Promise<MockExamsRepositoryResult<{ uuid: string; maxScore: number }>> {
  const client = getClient();
  const { data, error } = await client
    .from('mock_exams')
    .select('id, max_score')
    .eq('app_id', mockExamAppId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: `Mock exam not found: ${mockExamAppId}` };
  }
  return {
    ok: true,
    data: { uuid: data.id as string, maxScore: data.max_score as number },
  };
}

export async function fetchMockExamsBundleFromSupabase(): Promise<
  MockExamsRepositoryResult<MockExamsBundle>
> {
  const operation = 'fetchMockExamsBundleFromSupabase';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const [examsResult, resultsResult] = await Promise.all([
    client
      .from('mock_exams')
      .select('*')
      .order('exam_date', { ascending: true })
      .order('created_at', { ascending: true }),
    client.from('mock_exam_results').select(RESULT_SELECT),
  ]);

  if (examsResult.error) {
    logSupabaseQueryFailure(
      `${operation}.selectExams`,
      examsResult.error,
      startedAt,
    );
    return { ok: false, error: examsResult.error.message };
  }

  if (resultsResult.error) {
    logSupabaseQueryFailure(
      `${operation}.selectResults`,
      resultsResult.error,
      startedAt,
    );
    return { ok: false, error: resultsResult.error.message };
  }

  return {
    ok: true,
    data: {
      exams: mapMockExamRows(examsResult.data as MockExamRow[] | null),
      results: mapMockExamResultRows(
        resultsResult.data as MockExamResultWithAppIdsRow[] | null,
      ),
    },
  };
}

export async function fetchStudentMockExamsBundleByStudentAppId(
  studentAppId: string,
): Promise<MockExamsRepositoryResult<MockExamsBundle>> {
  const operation = 'fetchStudentMockExamsBundleByStudentAppId';
  const startedAt = startCrmOperationTimer();

  if (!isSupabaseConfiguredOnServer()) {
    logRepositoryFailure(operation, 'Supabase is not configured', startedAt);
    return { ok: false, error: 'Supabase is not configured' };
  }

  const studentResult = await resolveStudentUuid(studentAppId);
  if (!studentResult.ok) {
    return studentResult;
  }

  const client = getClient();
  const resultsQuery = await client
    .from('mock_exam_results')
    .select(RESULT_SELECT)
    .eq('student_id', studentResult.data);

  if (resultsQuery.error) {
    logSupabaseQueryFailure(
      `${operation}.selectResults`,
      resultsQuery.error,
      startedAt,
    );
    return { ok: false, error: resultsQuery.error.message };
  }

  const results = mapMockExamResultRows(
    resultsQuery.data as MockExamResultWithAppIdsRow[] | null,
  );
  const examAppIds = [...new Set(results.map((result) => result.mockExamId))];

  if (examAppIds.length === 0) {
    return { ok: true, data: { exams: [], results: [] } };
  }

  const examsQuery = await client
    .from('mock_exams')
    .select('*')
    .in('app_id', examAppIds)
    .order('exam_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (examsQuery.error) {
    logSupabaseQueryFailure(
      `${operation}.selectExams`,
      examsQuery.error,
      startedAt,
    );
    return { ok: false, error: examsQuery.error.message };
  }

  return {
    ok: true,
    data: {
      exams: mapMockExamRows(examsQuery.data as MockExamRow[] | null),
      results,
    },
  };
}

export async function insertMockExamToSupabase(
  exam: MockExam,
): Promise<MockExamsRepositoryResult<MockExam>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const validated = validateMockExamInput({
    title: exam.title,
    examDate: exam.examDate,
    maxScore: exam.maxScore,
  });
  if (!validated.ok) {
    return validated;
  }

  const client = getClient();
  const { data, error } = await client
    .from('mock_exams')
    .insert(
      mockExamToInsertRow({
        ...exam,
        title: validated.value.title,
        examDate: validated.value.examDate,
        maxScore: validated.value.maxScore,
      }),
    )
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: mapMockExamRow(data as MockExamRow) };
}

export async function updateMockExamInSupabase(
  mockExamAppId: string,
  input: MockExamUpdateInput,
): Promise<MockExamsRepositoryResult<MockExam>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const existing = await client
    .from('mock_exams')
    .select('id, max_score')
    .eq('app_id', mockExamAppId)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { ok: false, error: `Mock exam not found: ${mockExamAppId}` };
  }

  let highestExistingScore: number | null = null;
  if (input.maxScore !== undefined) {
    const scores = await client
      .from('mock_exam_results')
      .select('score')
      .eq('mock_exam_id', existing.data.id);

    if (scores.error) {
      return { ok: false, error: scores.error.message };
    }

    const values = (scores.data ?? []).map((row) => row.score as number);
    highestExistingScore = values.length > 0 ? Math.max(...values) : null;
  }

  const validated = validateMockExamUpdate(input, { highestExistingScore });
  if (!validated.ok) {
    return validated;
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (validated.value.title !== undefined) {
    patch.title = validated.value.title;
  }
  if (validated.value.examDate !== undefined) {
    patch.exam_date = validated.value.examDate;
  }
  if (validated.value.maxScore !== undefined) {
    patch.max_score = validated.value.maxScore;
  }

  const { data, error } = await client
    .from('mock_exams')
    .update(patch)
    .eq('app_id', mockExamAppId)
    .select('*')
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: mapMockExamRow(data as MockExamRow) };
}

export async function deleteMockExamFromSupabase(
  mockExamAppId: string,
): Promise<MockExamsRepositoryResult<null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const client = getClient();
  const { error } = await client
    .from('mock_exams')
    .delete()
    .eq('app_id', mockExamAppId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: null };
}

export async function upsertMockExamResultInSupabase(
  studentAppId: string,
  mockExamAppId: string,
  rawScore: string,
): Promise<MockExamsRepositoryResult<MockExamResult | null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const exam = await resolveMockExamUuid(mockExamAppId);
  if (!exam.ok) {
    return exam;
  }

  const validated = validateScoreInput(rawScore, exam.data.maxScore);
  if (!validated.ok) {
    return validated;
  }

  const student = await resolveStudentUuid(studentAppId);
  if (!student.ok) {
    return student;
  }

  const client = getClient();

  if (validated.clear) {
    const { error } = await client
      .from('mock_exam_results')
      .delete()
      .eq('student_id', student.data)
      .eq('mock_exam_id', exam.data.uuid);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: null };
  }

  const existing = await client
    .from('mock_exam_results')
    .select('app_id')
    .eq('student_id', student.data)
    .eq('mock_exam_id', exam.data.uuid)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: existing.error.message };
  }

  const now = new Date().toISOString();

  if (existing.data?.app_id) {
    const { data, error } = await client
      .from('mock_exam_results')
      .update({
        score: validated.score,
        updated_at: now,
      })
      .eq('app_id', existing.data.app_id)
      .select(RESULT_SELECT)
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    const mapped = mapMockExamResultRows([
      data as MockExamResultWithAppIdsRow,
    ])[0];
    if (!mapped) {
      return { ok: false, error: 'Failed to map saved result' };
    }
    return { ok: true, data: mapped };
  }

  const { data, error } = await client
    .from('mock_exam_results')
    .insert({
      app_id: generateMockExamResultId(),
      mock_exam_id: exam.data.uuid,
      student_id: student.data,
      score: validated.score,
      updated_at: now,
    })
    .select(RESULT_SELECT)
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const mapped = mapMockExamResultRows([
    data as MockExamResultWithAppIdsRow,
  ])[0];
  if (!mapped) {
    return { ok: false, error: 'Failed to map saved result' };
  }

  return { ok: true, data: mapped };
}
