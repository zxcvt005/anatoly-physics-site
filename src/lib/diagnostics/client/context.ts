import { getPublicBuildId, getPublicDeploymentId } from '@/lib/diagnostics/build-id';
import type {
  ClientDiagnosticEvent,
  ClientLifecycleMark,
} from '@/lib/diagnostics/client/types';

declare global {
  interface Window {
    __APP_DIAG_HTML_LOADED__?: number;
  }
}

let sessionId = '';
let initialFetchStarted = false;
let pageReadyMarked = false;
let pageReadyTimeoutId: ReturnType<typeof setTimeout> | undefined;

function createSessionId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `diag-${Date.now().toString(36)}-${randomPart}`;
}

export function getDiagnosticSessionId(): string {
  if (!sessionId) {
    sessionId = createSessionId();
  }
  return sessionId;
}

function getConnectionInfo():
  | ClientDiagnosticEvent['connection']
  | undefined {
  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    }
  ).connection;

  if (!connection) {
    return undefined;
  }

  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
}

export function collectDiagnosticContext(): Omit<
  ClientDiagnosticEvent,
  'timestamp' | 'kind' | 'operation'
> {
  return {
    pathname:
      typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
    language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connection: getConnectionInfo(),
    screenWidth: typeof screen !== 'undefined' ? screen.width : 0,
    screenHeight: typeof screen !== 'undefined' ? screen.height : 0,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    visibilityState:
      typeof document !== 'undefined' ? document.visibilityState : 'unknown',
    navigationType:
      typeof performance !== 'undefined'
        ? performance.navigation?.type
        : undefined,
    buildId: getPublicBuildId(),
    deploymentId: getPublicDeploymentId(),
    sessionId: getDiagnosticSessionId(),
  };
}

export function markInitialFetchStarted(): void {
  if (initialFetchStarted) {
    return;
  }
  initialFetchStarted = true;
}

export function hasInitialFetchStarted(): boolean {
  return initialFetchStarted;
}

export function isPageReadyMarked(): boolean {
  return pageReadyMarked;
}

export function setPageReadyMarked(): void {
  pageReadyMarked = true;
  if (pageReadyTimeoutId) {
    clearTimeout(pageReadyTimeoutId);
    pageReadyTimeoutId = undefined;
  }
}

export function schedulePageReadyTimeout(callback: () => void): void {
  if (pageReadyTimeoutId) {
    return;
  }

  pageReadyTimeoutId = setTimeout(() => {
    if (!pageReadyMarked) {
      callback();
    }
  }, 15000);
}

export function readHtmlLoadedTimestamp(): number | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.__APP_DIAG_HTML_LOADED__;
}

export type LifecycleMarkHandler = (mark: ClientLifecycleMark) => void;
