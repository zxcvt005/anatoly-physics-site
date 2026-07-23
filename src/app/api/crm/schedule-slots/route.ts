import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import { runInstrumentedApiRoute } from '@/lib/crm/api/route-diagnostics.server';
import {
  fetchScheduleSlotsFromSupabase,
  insertScheduleSlotToSupabase,
} from '@/lib/supabase/schedule-slots/repository';
import type { WeeklyScheduleSlot } from '@/types/tutor';

export async function GET(request: Request) {
  return runInstrumentedApiRoute(
    request,
    'GET /api/crm/schedule-slots',
    async () => {
      const notConfigured = assertSupabaseConfiguredOnServer();
      if (notConfigured) {
        return notConfigured;
      }

      return crmApiJson(await fetchScheduleSlotsFromSupabase(), 200, {
        operation: 'GET /api/crm/schedule-slots',
        requestUrl: request.url,
      });
    },
  );
}

export async function POST(request: Request) {
  return runInstrumentedApiRoute(
    request,
    'POST /api/crm/schedule-slots',
    async () => {
      const notConfigured = assertSupabaseConfiguredOnServer();
      if (notConfigured) {
        return notConfigured;
      }

      const body = (await request.json()) as { slot?: WeeklyScheduleSlot };
      if (!body.slot) {
        return crmApiJson(
          { ok: false, error: 'Missing slot' },
          200,
          {
            operation: 'POST /api/crm/schedule-slots',
            requestUrl: request.url,
          },
        );
      }

      return crmApiJson(await insertScheduleSlotToSupabase(body.slot), 201, {
        operation: 'POST /api/crm/schedule-slots',
        requestUrl: request.url,
      });
    },
  );
}
