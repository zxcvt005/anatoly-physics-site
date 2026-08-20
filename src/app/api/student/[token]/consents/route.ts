import { NextResponse } from 'next/server';
import { resolveLegalConsentsApiStatus } from '@/lib/legal/consent-api-status';
import {
  validateConsentInput,
} from '@/lib/legal/consent.server';
import { runInstrumentedApiRoute } from '@/lib/crm/api/route-diagnostics.server';
import {
  fetchStudentLegalConsentsByToken,
  recordStudentLegalConsentsByToken,
} from '@/lib/supabase/legal-consents/repository';
import type { RecordLegalConsentsRequest } from '@/types/legal-consent';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  return runInstrumentedApiRoute(
    _request,
    'GET /api/student/[token]/consents',
    async () => {
      const { token } = await context.params;
      const result = await fetchStudentLegalConsentsByToken(token);

      if (!result.ok) {
        return NextResponse.json(result, {
          status: resolveLegalConsentsApiStatus(result.error),
        });
      }

      return NextResponse.json({ ok: true, data: result.data });
    },
  );
}

export async function POST(request: Request, context: RouteContext) {
  return runInstrumentedApiRoute(
    request,
    'POST /api/student/[token]/consents',
    async () => {
      const { token } = await context.params;
      const body = (await request.json()) as RecordLegalConsentsRequest;

      if (!body.consents || !Array.isArray(body.consents)) {
        return NextResponse.json(
          { ok: false, error: 'consents array is required' },
          { status: 400 },
        );
      }

      for (const consent of body.consents) {
        const error = validateConsentInput(consent);
        if (error) {
          return NextResponse.json({ ok: false, error }, { status: 400 });
        }
      }

      const userAgent = request.headers.get('user-agent') ?? undefined;
      const result = await recordStudentLegalConsentsByToken(
        token,
        body.consents,
        userAgent,
      );

      if (!result.ok) {
        return NextResponse.json(result, {
          status: resolveLegalConsentsApiStatus(result.error),
        });
      }

      return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
    },
  );
}