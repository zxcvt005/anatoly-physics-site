import 'server-only';

import {
  getCrmOperationDurationMs,
  logCrmFailure,
  startCrmOperationTimer,
} from '@/lib/crm/diagnostics/log-failure.server';

export async function runInstrumentedApiRoute(
  request: Request,
  operation: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const startedAt = startCrmOperationTimer();
  const requestUrl = request.url;

  try {
    const response = await handler();
    const durationMs = getCrmOperationDurationMs(startedAt);

    if (response.status >= 400) {
      let errorBody: unknown;

      try {
        errorBody = await response.clone().json();
      } catch {
        errorBody = `Non-JSON error response (${response.status})`;
      }

      logCrmFailure({
        operation,
        requestUrl,
        httpStatus: response.status,
        durationMs,
        error: errorBody,
      });
    }

    return response;
  } catch (error) {
    logCrmFailure({
      operation,
      requestUrl,
      httpStatus: 500,
      durationMs: getCrmOperationDurationMs(startedAt),
      error,
    });
    throw error;
  }
}
