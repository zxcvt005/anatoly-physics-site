import {
  flushClientDiagnostics,
  markClientLifecycle,
  recordClientDiagnosticEvent,
} from '@/lib/diagnostics/client/buffer';
import {
  readHtmlLoadedTimestamp,
  schedulePageReadyTimeout,
  setPageReadyMarked,
} from '@/lib/diagnostics/client/context';
import type { ClientDiagnosticEvent } from '@/lib/diagnostics/client/types';

let initialized = false;

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

function reportWindowError(
  operation: string,
  message: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: unknown,
): void {
  const parsed = errorFromUnknown(error ?? message);
  recordClientDiagnosticEvent({
    kind: 'error',
    operation,
    errorName: parsed.name,
    errorMessage:
      typeof message === 'string'
        ? message
        : parsed.message || 'Unknown window error',
    stack: parsed.stack,
    requestUrl: source,
  });

  if (typeof source === 'string') {
    recordClientDiagnosticEvent({
      kind: 'error',
      operation: `${operation}:location`,
      errorMessage: `${source}:${lineno ?? 0}:${colno ?? 0}`,
    });
  }

  flushClientDiagnostics('error');
}

function isChunkLoadError(message: string, source?: string): boolean {
  const haystack = `${message} ${source ?? ''}`.toLowerCase();
  return (
    haystack.includes('loading chunk') ||
    haystack.includes('failed to fetch dynamically imported module') ||
    haystack.includes('importing a module script failed') ||
    haystack.includes('_next/static/chunks')
  );
}

export function initClientDiagnostics(): void {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;

  const htmlLoadedAt = readHtmlLoadedTimestamp();
  markClientLifecycle('HTML_LOADED');
  if (htmlLoadedAt) {
    recordClientDiagnosticEvent({
      kind: 'lifecycle',
      operation: 'HTML_LOADED:timestamp',
      durationMs: Date.now() - htmlLoadedAt,
    });
  }

  markClientLifecycle('CLIENT_SCRIPT_STARTED');

  window.addEventListener('error', (event) => {
    const message = event.message || 'Script error';
    const operation = isChunkLoadError(message, event.filename)
      ? 'window.error:chunk-load'
      : event.target instanceof HTMLScriptElement
        ? 'window.error:script'
        : 'window.error';

    reportWindowError(
      operation,
      message,
      event.filename ?? undefined,
      event.lineno,
      event.colno,
      event.error,
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const parsed = errorFromUnknown(event.reason);
    const operation =
      parsed.message.includes('Failed to fetch') ||
      parsed.name === 'AbortError'
        ? 'unhandledrejection:fetch'
        : parsed.message.includes('dynamically imported module')
          ? 'unhandledrejection:dynamic-import'
          : 'unhandledrejection';

    recordClientDiagnosticEvent({
      kind: 'error',
      operation,
      errorName: parsed.name,
      errorMessage: parsed.message,
      stack: parsed.stack,
    });
    flushClientDiagnostics('error');
  });

  window.addEventListener('pagehide', () => {
    flushClientDiagnostics('pagehide');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushClientDiagnostics('visibility-hidden');
    }
  });

  schedulePageReadyTimeout(() => {
    flushClientDiagnostics('page-ready-timeout');
  });

  window.onerror = (message, source, lineno, colno, error) => {
    reportWindowError(
      'window.onerror',
      message,
      source ?? undefined,
      lineno,
      colno,
      error,
    );
    return false;
  };
}

export function reportClientBoundaryError(
  operation: string,
  error: Error,
  extra?: Partial<ClientDiagnosticEvent>,
): void {
  recordClientDiagnosticEvent({
    kind: 'error',
    operation,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
    ...extra,
  });
  flushClientDiagnostics('error');
}

export function markPageReady(): void {
  if (typeof window === 'undefined') {
    return;
  }

  setPageReadyMarked();
  markClientLifecycle('PAGE_READY');

  const navEntry = performance.getEntriesByType('navigation')[0] as
    | (PerformanceNavigationTiming & { deliveryType?: string })
    | undefined;

  recordClientDiagnosticEvent({
    kind: 'lifecycle',
    operation: 'PAGE_READY:navigation',
    cacheMode:
      navEntry?.deliveryType ??
      (typeof performance.navigation !== 'undefined'
        ? String(performance.navigation.type)
        : 'unknown'),
  });

  flushClientDiagnostics('page-ready');
}
