import type {
  ClientDiagnosticBatch,
  ClientDiagnosticEvent,
  ClientLifecycleMark,
} from '@/lib/diagnostics/client/types';
import { collectDiagnosticContext } from '@/lib/diagnostics/client/context';

const MAX_BUFFER_EVENTS = 40;

const lifecycleMarks = new Set<ClientLifecycleMark>();
const bufferedEvents: ClientDiagnosticEvent[] = [];

let flushHandler: ((batch: ClientDiagnosticBatch) => void) | null = null;

function pushEvent(event: ClientDiagnosticEvent): void {
  bufferedEvents.push(event);
  if (bufferedEvents.length > MAX_BUFFER_EVENTS) {
    bufferedEvents.splice(0, bufferedEvents.length - MAX_BUFFER_EVENTS);
  }
}

export function registerDiagnosticFlushHandler(
  handler: (batch: ClientDiagnosticBatch) => void,
): void {
  flushHandler = handler;
}

export function markClientLifecycle(
  mark: ClientLifecycleMark,
  operation = mark,
): void {
  if (lifecycleMarks.has(mark)) {
    return;
  }

  lifecycleMarks.add(mark);
  pushEvent({
    ...collectDiagnosticContext(),
    timestamp: new Date().toISOString(),
    kind: 'lifecycle',
    operation,
    lifecycleMark: mark,
  });
}

export function recordClientDiagnosticEvent(
  partial: Partial<ClientDiagnosticEvent> &
    Pick<ClientDiagnosticEvent, 'kind' | 'operation'>,
): void {
  pushEvent({
    ...collectDiagnosticContext(),
    ...partial,
    timestamp: new Date().toISOString(),
  });
}

export function getBufferedDiagnosticEvents(): ClientDiagnosticEvent[] {
  return [...bufferedEvents];
}

export function flushClientDiagnostics(
  reason: ClientDiagnosticBatch['reason'],
  extraEvents: ClientDiagnosticEvent[] = [],
): void {
  if (!flushHandler) {
    return;
  }

  const context = collectDiagnosticContext();
  const events = [...bufferedEvents, ...extraEvents];

  if (events.length === 0) {
    return;
  }

  flushHandler({
    sessionId: context.sessionId,
    buildId: context.buildId,
    deploymentId: context.deploymentId,
    pathname: context.pathname,
    reason,
    events,
  });

  bufferedEvents.length = 0;
}

export function hasLifecycleMark(mark: ClientLifecycleMark): boolean {
  return lifecycleMarks.has(mark);
}
