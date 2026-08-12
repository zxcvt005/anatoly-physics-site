import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { createLessonHomeworkAssignmentInSupabase } from '@/lib/supabase/tests/repository';

export async function POST(request: Request) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) return notConfigured;

  const body = (await request.json()) as {
    studentId?: string;
    lessonId?: string;
    topicId?: string;
  };

  if (!body.studentId || !body.lessonId || !body.topicId) {
    return crmApiJson({ ok: false, error: 'Missing studentId, lessonId or topicId' });
  }

  return crmApiJson(
    await createLessonHomeworkAssignmentInSupabase({
      studentAppId: body.studentId,
      lessonAppId: body.lessonId,
      topicAppId: body.topicId,
    }),
  );
}
