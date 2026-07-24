export type ClientLifecycleMark =
  | 'HTML_LOADED'
  | 'CLIENT_SCRIPT_STARTED'
  | 'APP_MOUNT_STARTED'
  | 'APP_MOUNT_COMPLETED'
  | 'HYDRATION_STARTED'
  | 'HYDRATION_COMPLETED'
  | 'INITIAL_FETCH_STARTED'
  | 'INITIAL_FETCH_COMPLETED'
  | 'PAGE_READY';

export type ClientDiagnosticKind =
  | 'lifecycle'
  | 'error'
  | 'fetch'
  | 'report';

export interface ClientConnectionInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface ClientDiagnosticEvent {
  timestamp: string;
  kind: ClientDiagnosticKind;
  operation: string;
  pathname: string;
  userAgent: string;
  platform: string;
  language: string;
  online: boolean;
  connection?: ClientConnectionInfo;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  visibilityState: string;
  navigationType?: number;
  buildId: string;
  deploymentId?: string;
  sessionId: string;
  lifecycleMark?: ClientLifecycleMark;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
  requestUrl?: string;
  httpMethod?: string;
  httpStatus?: number;
  durationMs?: number;
  contentType?: string;
  jsonParseSuccess?: boolean;
  cacheMode?: string;
}

export interface ClientDiagnosticBatch {
  sessionId: string;
  buildId: string;
  deploymentId?: string;
  pathname: string;
  reason: 'error' | 'pagehide' | 'visibility-hidden' | 'page-ready-timeout' | 'page-ready' | 'manual';
  events: ClientDiagnosticEvent[];
}
