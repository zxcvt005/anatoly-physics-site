import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import type { MockExamUpdateInput } from '@/lib/mock-exams/types';
import {
  deleteMockExamFromSupabase,
  updateMockExamInSupabase,
} from '@/lib/supabase/mock-exams/repository';

type RouteContext = {
  params: Promise<{ mockExamId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { mockExamId } = await context.params;
  if (!mockExamId?.trim()) {
    return crmApiJson({ ok: false, error: 'Missing mockExamId' });
  }

  const body = (await request.json()) as MockExamUpdateInput;
  return crmApiJson(await updateMockExamInSupabase(mockExamId, body));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { mockExamId } = await context.params;
  if (!mockExamId?.trim()) {
    return crmApiJson({ ok: false, error: 'Missing mockExamId' });
  }

  return crmApiJson(await deleteMockExamFromSupabase(mockExamId));
}
