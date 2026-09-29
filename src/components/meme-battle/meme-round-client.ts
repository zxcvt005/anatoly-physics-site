import type { MemePlacement, MemeRoundPayload } from '@/lib/meme-battle/types';

export const VOTE_SAVED_CODES = new Set(['already_completed']);

export const VOTE_STOP_CODES = new Set([
  'round_void',
  'invalid_image',
  'invalid_places',
  'event_closed',
  'event_scheduled',
  'round_not_found',
  'no_event',
  'not_found',
  'already_voted',
]);

type RoundResponse = {
  ok: boolean;
  code?: string;
  error?: string;
  data?: MemeRoundPayload;
};

export function preloadMemeImages(urls: readonly string[]): Promise<boolean> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<boolean>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(true);
          image.onerror = () => resolve(false);
          image.src = url;
        }),
    ),
  ).then((flags) => flags.length > 0 && flags.every(Boolean));
}

export async function requestMemeRound(
  token: string,
  kind: 'current' | 'prepare',
): Promise<RoundResponse> {
  const path = kind === 'prepare' ? 'rounds/prefetch' : 'rounds';
  const response = await fetch(`/api/student/${encodeURIComponent(token)}/meme-battle/${path}`, {
    method: 'POST',
  });
  return (await response.json()) as RoundResponse;
}

export async function submitMemeVote(
  token: string,
  roundId: string,
  placements: MemePlacement[],
): Promise<{ ok: true } | { ok: false; code?: string }> {
  try {
    const response = await fetch(
      `/api/student/${encodeURIComponent(token)}/meme-battle/rounds/${encodeURIComponent(roundId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placements }),
      },
    );
    const body = (await response.json()) as { ok?: boolean; code?: string };
    if (response.ok && body.ok) return { ok: true };
    if (body.code && VOTE_SAVED_CODES.has(body.code)) return { ok: true };
    return { ok: false, code: body.code };
  } catch {
    return { ok: false };
  }
}

export function sendVoteKeepalive(token: string, roundId: string, placements: MemePlacement[]): void {
  void fetch(
    `/api/student/${encodeURIComponent(token)}/meme-battle/rounds/${encodeURIComponent(roundId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placements }),
      keepalive: true,
    },
  );
}

export function releasePreparedKeepalive(token: string, roundId: string): void {
  void fetch(
    `/api/student/${encodeURIComponent(token)}/meme-battle/rounds/${encodeURIComponent(roundId)}`,
    { method: 'DELETE', keepalive: true },
  );
}

export async function activateMemeRound(
  token: string,
  roundId: string,
): Promise<'ok' | 'retry' | 'stop' | 'limit'> {
  try {
    const response = await fetch(
      `/api/student/${encodeURIComponent(token)}/meme-battle/rounds/${encodeURIComponent(roundId)}/activate`,
      { method: 'POST' },
    );
    const body = (await response.json()) as { ok?: boolean; code?: string };
    if (response.ok && body.ok) return 'ok';
    if (body.code === 'vote_limit') return 'limit';
    if (body.code && VOTE_STOP_CODES.has(body.code)) return 'stop';
    return 'retry';
  } catch {
    return 'retry';
  }
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
