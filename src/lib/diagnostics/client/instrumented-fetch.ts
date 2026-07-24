import { sanitizeDiagnosticUrl } from '@/lib/diagnostics/sanitize-url';
import {
  markClientLifecycle,
  recordClientDiagnosticEvent,
} from '@/lib/diagnostics/client/buffer';
import {
  hasInitialFetchStarted,
  markInitialFetchStarted,
} from '@/lib/diagnostics/client/context';
import { hasLifecycleMark } from '@/lib/diagnostics/client/buffer';

export interface DiagnosticFetchOptions extends RequestInit {
  diagnosticOperation: string;
  parseJson?: boolean;
}

function errorFromUnknown(error: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'Error',
    message: String(error),
  };
}

export async function diagnosticFetch(
  input: RequestInfo | URL,
  options: DiagnosticFetchOptions,
): Promise<Response> {
  const startedAt = Date.now();
  const method = options.method ?? 'GET';
  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const requestUrl = sanitizeDiagnosticUrl(
    rawUrl,
    typeof window !== 'undefined' ? window.location.origin : undefined,
  );

  if (!hasInitialFetchStarted()) {
    markInitialFetchStarted();
    markClientLifecycle('INITIAL_FETCH_STARTED');
  }

  recordClientDiagnosticEvent({
    kind: 'fetch',
    operation: `${options.diagnosticOperation}:start`,
    requestUrl,
    httpMethod: method,
  });

  try {
    const response = await fetch(input, options);
    const durationMs = Date.now() - startedAt;
    const contentType = response.headers.get('content-type') ?? undefined;

    recordClientDiagnosticEvent({
      kind: 'fetch',
      operation: `${options.diagnosticOperation}:complete`,
      requestUrl,
      httpMethod: method,
      httpStatus: response.status,
      durationMs,
      contentType,
    });

    if (!hasLifecycleMark('INITIAL_FETCH_COMPLETED')) {
      markClientLifecycle('INITIAL_FETCH_COMPLETED');
    }

    return response;
  } catch (error) {
    const parsed = errorFromUnknown(error);
    const durationMs = Date.now() - startedAt;

    recordClientDiagnosticEvent({
      kind: 'fetch',
      operation: `${options.diagnosticOperation}:network-error`,
      requestUrl,
      httpMethod: method,
      durationMs,
      errorName: parsed.name,
      errorMessage: parsed.message,
      stack: parsed.stack,
    });

    recordClientDiagnosticEvent({
      kind: 'error',
      operation: options.diagnosticOperation,
      requestUrl,
      httpMethod: method,
      durationMs,
      errorName: parsed.name,
      errorMessage: parsed.message,
      stack: parsed.stack,
    });

    throw error;
  }
}

export async function diagnosticFetchJson<T>(
  input: RequestInfo | URL,
  options: DiagnosticFetchOptions,
): Promise<{ response: Response; data: T | null; parseOk: boolean }> {
  const response = await diagnosticFetch(input, options);
  const requestUrl = sanitizeDiagnosticUrl(
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url,
    typeof window !== 'undefined' ? window.location.origin : undefined,
  );

  try {
    const data = (await response.clone().json()) as T;
    recordClientDiagnosticEvent({
      kind: 'fetch',
      operation: `${options.diagnosticOperation}:json-parse`,
      requestUrl,
      httpMethod: options.method ?? 'GET',
      httpStatus: response.status,
      jsonParseSuccess: true,
      contentType: response.headers.get('content-type') ?? undefined,
    });
    return { response, data, parseOk: true };
  } catch (error) {
    const parsed = errorFromUnknown(error);
    recordClientDiagnosticEvent({
      kind: 'fetch',
      operation: `${options.diagnosticOperation}:json-parse-failed`,
      requestUrl,
      httpMethod: options.method ?? 'GET',
      httpStatus: response.status,
      jsonParseSuccess: false,
      errorName: parsed.name,
      errorMessage: parsed.message,
      stack: parsed.stack,
    });
    return { response, data: null, parseOk: false };
  }
}
