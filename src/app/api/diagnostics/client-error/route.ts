import { NextResponse } from 'next/server';
import {
  getServerBuildId,
  getServerDeploymentId,
} from '@/lib/diagnostics/build-id.server';
import type { ClientDiagnosticBatch } from '@/lib/diagnostics/client/types';

const LOG_PREFIX = '[client:diagnostics]';
const MAX_BODY_BYTES = 24_000;
const MAX_STACK_LENGTH = 8_000;
const MAX_EVENTS = 25;

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateLimitByIp = new Map<string, RateBucket>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 40;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitByIp.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    rateLimitByIp.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

function truncate(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return value;
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…[truncated]`;
}

function sanitizeBatch(raw: ClientDiagnosticBatch): ClientDiagnosticBatch {
  return {
    ...raw,
    events: (raw.events ?? []).slice(0, MAX_EVENTS).map((event) => ({
      ...event,
      stack: truncate(event.stack, MAX_STACK_LENGTH),
      errorMessage: truncate(event.errorMessage, 1000),
    })),
  };
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    if (isRateLimited(ip)) {
      console.error(`${LOG_PREFIX} rate-limited`, JSON.stringify({ ip }));
      return NextResponse.json({ ok: true, accepted: false, reason: 'rate-limited' });
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      console.error(
        `${LOG_PREFIX} payload-too-large`,
        JSON.stringify({ bytes: rawBody.length, ip }),
      );
      return NextResponse.json({ ok: true, accepted: false, reason: 'payload-too-large' });
    }

    let batch: ClientDiagnosticBatch;
    try {
      batch = JSON.parse(rawBody) as ClientDiagnosticBatch;
    } catch (error) {
      console.error(
        `${LOG_PREFIX} invalid-json`,
        JSON.stringify({
          ip,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return NextResponse.json({ ok: true, accepted: false, reason: 'invalid-json' });
    }

    const sanitized = sanitizeBatch(batch);
    const payload = {
      serverBuildId: getServerBuildId(),
      serverDeploymentId: getServerDeploymentId(),
      requestBuildId: sanitized.buildId,
      requestDeploymentId: sanitized.deploymentId,
      sessionId: sanitized.sessionId,
      pathname: sanitized.pathname,
      reason: sanitized.reason,
      eventCount: sanitized.events.length,
      events: sanitized.events,
    };

    console.error(`${LOG_PREFIX} ${JSON.stringify(payload, null, 2)}`);

    return NextResponse.json({
      ok: true,
      accepted: true,
      buildId: getServerBuildId(),
    });
  } catch (error) {
    console.error(
      `${LOG_PREFIX} handler-error`,
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );

    return NextResponse.json({ ok: true, accepted: false, reason: 'handler-error' });
  }
}
