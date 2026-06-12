import {
  assertSupabaseConfiguredOnServer,
  crmApiJson,
} from '@/lib/crm/api/route-utils';
import {
  setPaymentTaxAccountedInSupabase,
  updatePaymentStatusInSupabase,
} from '@/lib/supabase/payments/repository';
import type { PaymentStatus } from '@/types/tutor';

interface RouteContext {
  params: Promise<{ paymentId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const notConfigured = assertSupabaseConfiguredOnServer();
  if (notConfigured) {
    return notConfigured;
  }

  const { paymentId } = await context.params;
  const body = (await request.json()) as {
    status?: PaymentStatus;
    taxAccounted?: boolean;
  };

  if (body.status !== undefined) {
    return crmApiJson(
      await updatePaymentStatusInSupabase(paymentId, body.status),
    );
  }

  if (body.taxAccounted !== undefined) {
    return crmApiJson(
      await setPaymentTaxAccountedInSupabase(paymentId, body.taxAccounted),
    );
  }

  return crmApiJson({ ok: false, error: 'Missing status or taxAccounted' });
}
