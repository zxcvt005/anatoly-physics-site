const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'password',
  'access_token',
  'refresh_token',
  'apikey',
  'key',
]);

function hashTokenFragment(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `h${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function maskPathSegment(segment: string, previous: string | undefined): string {
  if (previous === 'student' || previous === 'api') {
    return `[redacted:${hashTokenFragment(segment)}]`;
  }

  if (segment.length >= 16 && /^[\w-]+$/.test(segment)) {
    return `[redacted:${hashTokenFragment(segment)}]`;
  }

  return segment;
}

export function sanitizeDiagnosticUrl(rawUrl: string, baseOrigin?: string): string {
  try {
    const url = rawUrl.startsWith('http')
      ? new URL(rawUrl)
      : new URL(rawUrl, baseOrigin ?? 'https://local.invalid');

    const segments = url.pathname.split('/').filter(Boolean);
    const maskedSegments: string[] = [];

    for (let index = 0; index < segments.length; index += 1) {
      const previous = index > 0 ? segments[index - 1] : undefined;
      const previousPrevious = index > 1 ? segments[index - 2] : undefined;
      const current = segments[index];

      if (previous === 'student' && previousPrevious === 'api') {
        maskedSegments.push(`[redacted:${hashTokenFragment(current)}]`);
        continue;
      }

      if (previous === 'student' && previousPrevious !== 'api') {
        maskedSegments.push(`[redacted:${hashTokenFragment(current)}]`);
        continue;
      }

      maskedSegments.push(maskPathSegment(current, previous));
    }

    const sanitizedParams = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        sanitizedParams.set(key, `[redacted:${hashTokenFragment(value)}]`);
        return;
      }
      sanitizedParams.set(key, value);
    });

    const search = sanitizedParams.toString();
    return `/${maskedSegments.join('/')}${search ? `?${search}` : ''}`;
  } catch {
    return '[invalid-url]';
  }
}
