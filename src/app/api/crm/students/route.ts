import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { runInstrumentedApiRoute } from '@/lib/crm/api/route-diagnostics.server';
import {
  fetchStudentsFromSupabase,
  insertStudentToSupabase,
} from '@/lib/supabase/students/repository';
import type { Student } from '@/types/tutor';

export async function GET(request: Request) {
  return runInstrumentedApiRoute(request, 'GET /api/crm/students', async () => {
    const notConfigured = assertSupabaseConfiguredOnServer();
    if (notConfigured) {
      return notConfigured;
    }

    return crmApiJson(await fetchStudentsFromSupabase(), 200, {
      operation: 'GET /api/crm/students',
      requestUrl: request.url,
    });
  });
}

export async function POST(request: Request) {
  return runInstrumentedApiRoute(request, 'POST /api/crm/students', async () => {
    const notConfigured = assertSupabaseConfiguredOnServer();
    if (notConfigured) {
      return notConfigured;
    }

    const body = (await request.json()) as { student?: Student };
    if (!body.student) {
      return crmApiJson(
        { ok: false, error: 'Missing student' },
        200,
        {
          operation: 'POST /api/crm/students',
          requestUrl: request.url,
        },
      );
    }

    return crmApiJson(await insertStudentToSupabase(body.student), 201, {
      operation: 'POST /api/crm/students',
      requestUrl: request.url,
    });
  });
}
