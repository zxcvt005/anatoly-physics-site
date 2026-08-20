import { NextResponse } from 'next/server';
import { runInstrumentedApiRoute } from '@/lib/crm/api/route-diagnostics.server';
import {
  snapshotHasRequiredPaymentConsents,
  validatePaymentReportConsents,
} from '@/lib/legal/consent.server';
import { resolveLegalConsentsApiStatus } from '@/lib/legal/consent-api-status';
import {
  fetchStudentLegalConsentsByToken,
  recordStudentLegalConsentsByToken,
} from '@/lib/supabase/legal-consents/repository';
import { createStudentPortalPendingPayment } from '@/lib/student-portal/repository.server';
import type { RecordLegalConsentInput } from '@/types/legal-consent';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  return runInstrumentedApiRoute(
    request,
    'POST /api/student/[token]/payments',
    async () => {
      const { token } = await context.params;
      const body = (await request.json()) as {
        id?: string;
        amount?: number;
        note?: string;
        studentId?: string;
        status?: string;
        consents?: RecordLegalConsentInput[];
      };

      if (body.studentId !== undefined) {
        return NextResponse.json(
          { ok: false, error: 'studentId is not allowed' },
          { status: 400 },
        );
      }

      if (body.status !== undefined && body.status !== 'pending') {
        return NextResponse.json(
          {
            ok: false,
            error: 'Only pending payments can be created from student portal',
          },
          { status: 400 },
        );
      }

      if (!body.id || body.amount === undefined) {
        return NextResponse.json(
          { ok: false, error: 'Missing id or amount' },
          { status: 400 },
        );
      }

      const existingConsents = await fetchStudentLegalConsentsByToken(token);
      if (!existingConsents.ok) {
        return NextResponse.json(existingConsents, {
          status: resolveLegalConsentsApiStatus(existingConsents.error),
        });
      }

      const hasValidConsents = snapshotHasRequiredPaymentConsents(
        existingConsents.data,
      );

      if (!hasValidConsents) {
        if (!body.consents || body.consents.length === 0) {
          return NextResponse.json(
            {
              ok: false,
              error: 'Offer and privacy consents are required',
            },
            { status: 400 },
          );
        }

        const consentError = validatePaymentReportConsents(body.consents);
        if (consentError) {
          return NextResponse.json(
            { ok: false, error: consentError },
            { status: 400 },
          );
        }

        const userAgent = request.headers.get('user-agent') ?? undefined;
        const recordResult = await recordStudentLegalConsentsByToken(
          token,
          body.consents,
          userAgent,
        );

        if (!recordResult.ok) {
          return NextResponse.json(recordResult, {
            status: resolveLegalConsentsApiStatus(recordResult.error),
          });
        }
      }

      const result = await createStudentPortalPendingPayment(token, {
        id: body.id,
        amount: body.amount,
        note: body.note,
      });

      if (!result.ok) {
        const status = result.error === 'Student not found' ? 404 : 400;
        return NextResponse.json(result, { status });
      }

      return NextResponse.json(result, { status: 201 });
    },
  );
}
