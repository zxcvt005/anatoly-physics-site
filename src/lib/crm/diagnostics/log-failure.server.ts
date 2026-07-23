import 'server-only';

const LOG_PREFIX = '[crm:diagnostics]';

export interface CrmFailureLogContext {
  operation: string;
  requestUrl?: string;
  httpStatus?: number;
  error?: unknown;
  supabaseError?: unknown;
  durationMs?: number;
}

function serializeUnknown(value: unknown): Record<string, unknown> {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value && typeof value === 'object') {
    return { ...(value as Record<string, unknown>) };
  }

  return { message: String(value) };
}

export function logCrmFailure(context: CrmFailureLogContext): void {
  const payload = {
    timestamp: new Date().toISOString(),
    operation: context.operation,
    requestUrl: context.requestUrl,
    httpStatus: context.httpStatus,
    durationMs: context.durationMs,
    error:
      context.error === undefined ? undefined : serializeUnknown(context.error),
    supabaseError:
      context.supabaseError === undefined
        ? undefined
        : serializeUnknown(context.supabaseError),
    stackTrace:
      context.error instanceof Error
        ? context.error.stack
        : new Error(`[${context.operation}] diagnostic stack capture`).stack,
  };

  console.error(`${LOG_PREFIX} ${JSON.stringify(payload, null, 2)}`);
}

export function startCrmOperationTimer(): number {
  return Date.now();
}

export function getCrmOperationDurationMs(startedAt: number): number {
  return Date.now() - startedAt;
}
