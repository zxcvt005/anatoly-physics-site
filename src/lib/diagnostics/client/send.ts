import type { ClientDiagnosticBatch } from '@/lib/diagnostics/client/types';

const ENDPOINT = '/api/diagnostics/client-error';
const MAX_SENDS_PER_SESSION = 20;
const MIN_SEND_INTERVAL_MS = 2000;

let sendCount = 0;
let lastSendAt = 0;
let endpointFailures = 0;
let endpointDisabled = false;

function canSend(force: boolean): boolean {
  if (endpointDisabled) {
    return false;
  }

  if (force) {
    return sendCount < MAX_SENDS_PER_SESSION;
  }

  const now = Date.now();
  if (sendCount >= MAX_SENDS_PER_SESSION) {
    return false;
  }

  if (now - lastSendAt < MIN_SEND_INTERVAL_MS) {
    return false;
  }

  return true;
}

function markSendAttempt(): void {
  sendCount += 1;
  lastSendAt = Date.now();
}

function markSendFailure(): void {
  endpointFailures += 1;
  if (endpointFailures >= 3) {
    endpointDisabled = true;
  }
}

function markSendSuccess(): void {
  endpointFailures = 0;
}

export function sendClientDiagnosticBatch(
  batch: ClientDiagnosticBatch,
  force = false,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!canSend(force)) {
    return;
  }

  markSendAttempt();

  const payload = JSON.stringify(batch);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      const accepted = navigator.sendBeacon(ENDPOINT, blob);
      if (accepted) {
        markSendSuccess();
        return;
      }
    }
  } catch {
    // fall through to fetch
  }

  void fetch(ENDPOINT, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
    keepalive: true,
  })
    .then((response) => {
      if (!response.ok) {
        markSendFailure();
        return;
      }
      markSendSuccess();
    })
    .catch(() => {
      markSendFailure();
    });
}
