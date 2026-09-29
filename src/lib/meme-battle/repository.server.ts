import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';
import { logRepositoryFailure } from '@/lib/supabase/log-query-failure.server';
import { eligibleMemeCandidates, selectBalancedTriple } from './balanced-sample';
import { MEME_BATTLE_BUCKET, MEME_BATTLE_SLUG } from './constants';
import { validateMemeImageBytes } from './images';
import { averageMemePoints, rankMemeImages } from './ranking';
import { memeEventPhase } from './time';
import type {
  AdminMemeStudentGroup,
  MemeBattleOverview,
  MemeEventPhase,
  MemePlacement,
  MemeRoundPayload,
} from './types';
import { placementsAreValid } from './voting';
import { canCreateVoteRound, maxVoteRoundsForOwnImages } from './vote-quota';

type Result<T> = { ok: true; data: T } | { ok: false; code: string; error?: string };

type EventRow = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  starts_at: string;
  ends_at: string;
  max_images_per_student: number;
};

type RpcPayload = {
  ok?: boolean;
  code?: string;
  roundId?: string;
  imageId?: string;
  imageIds?: unknown;
  storagePath?: string;
};

const SIGNED_URL_SECONDS = 60 * 60 * 6;

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /meme_events|meme_images|schema cache/i.test(error.message ?? '')
  );
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap] as T;
    copy[swap] = current as T;
  }
  return copy;
}

async function signedUrlMap(
  client: SupabaseClient,
  rows: readonly { id: string; path: string }[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let offset = 0; offset < rows.length; offset += 80) {
    const chunk = rows.slice(offset, offset + 80);
    const { data, error } = await client.storage.from(MEME_BATTLE_BUCKET).createSignedUrls(
      chunk.map((row) => row.path),
      SIGNED_URL_SECONDS,
    );
    if (error || !data) continue;
    data.forEach((item, index) => {
      const id = chunk[index]?.id;
      if (id && item.signedUrl) map.set(id, item.signedUrl);
    });
  }
  return map;
}

async function loadEvent(
  client: SupabaseClient,
): Promise<Result<EventRow | null>> {
  const { data, error } = await client
    .from('meme_events')
    .select('id, name, tagline, description, starts_at, ends_at, max_images_per_student')
    .eq('slug', MEME_BATTLE_SLUG)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return { ok: true, data: null };
    return { ok: false, code: 'unavailable', error: error.message };
  }

  return { ok: true, data: (data as EventRow | null) ?? null };
}

function phaseOf(event: EventRow, nowMs = Date.now()): MemeEventPhase {
  return memeEventPhase(event.starts_at, event.ends_at, nowMs);
}

export async function resolveMemeStudent(
  token: string,
): Promise<{ ok: true; studentId: string } | { ok: false; status: number; error: string }> {
  if (!token.trim()) {
    return { ok: false, status: 404, error: 'Missing token' };
  }
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, status: 503, error: 'Supabase is not configured' };
  }

  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('access_token', token)
    .maybeSingle();

  if (error) {
    logRepositoryFailure('resolveMemeStudent', error.message);
    return { ok: false, status: 400, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, status: 404, error: 'Student not found' };
  }

  return { ok: true, studentId: data.id as string };
}

export async function fetchMemeBattleOverview(
  studentId: string,
): Promise<Result<MemeBattleOverview | null>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, code: 'unavailable', error: 'Supabase is not configured' };
  }

  const client = createSupabaseAdminClient();
  const eventResult = await loadEvent(client);
  if (!eventResult.ok) return eventResult;
  if (!eventResult.data) return { ok: true, data: null };

  const event = eventResult.data;
  const phase = phaseOf(event);
  const revealAuthors = phase === 'ended';

  const [mineResult, votesResult, roundsResult, collageResult, rankingResult, activeCountResult] =
    await Promise.all([
      client
        .from('meme_images')
        .select('id, storage_path, created_at')
        .eq('event_id', event.id)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      client
        .from('meme_image_votes')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('student_id', studentId),
      client
        .from('meme_rating_rounds')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('student_id', studentId)
        .not('completed_at', 'is', null),
      client
        .from('meme_images')
        .select('id, storage_path')
        .eq('event_id', event.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(16),
      client
        .from('meme_images')
        .select(
          'id, student_id, storage_path, total_votes, total_points, first_place_count, second_place_count, third_place_count',
        )
        .eq('event_id', event.id)
        .eq('is_active', true)
        .gt('total_votes', 0),
      client
        .from('meme_images')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('is_active', true),
    ]);

  const firstError = [
    mineResult.error,
    votesResult.error,
    roundsResult.error,
    collageResult.error,
    rankingResult.error,
    activeCountResult.error,
  ].find(Boolean);
  if (firstError) {
    if (isMissingRelation(firstError)) return { ok: true, data: null };
    logRepositoryFailure('fetchMemeBattleOverview', firstError.message);
    return { ok: false, code: 'unavailable', error: firstError.message };
  }

  const mineRows = (mineResult.data ?? []) as {
    id: string;
    storage_path: string;
    created_at: string;
  }[];
  const collageRows = shuffle(
    (collageResult.data ?? []) as { id: string; storage_path: string }[],
  ).slice(0, 4);
  const rankingRows = (rankingResult.data ?? []) as {
    id: string;
    student_id: string;
    storage_path: string;
    total_votes: number;
    total_points: number;
    first_place_count: number;
    second_place_count: number;
    third_place_count: number;
  }[];
  const authorNames = new Map<string, string>();
  if (revealAuthors && rankingRows.length > 0) {
    const { data: authorRows } = await client
      .from('students')
      .select('id, first_name')
      .in('id', [...new Set(rankingRows.map((row) => row.student_id))]);
    for (const row of (authorRows ?? []) as { id: string; first_name: string | null }[]) {
      const name = row.first_name?.trim();
      if (name) authorNames.set(row.id, name);
    }
  }

  const urls = await signedUrlMap(client, [
    ...mineRows.map((row) => ({ id: row.id, path: row.storage_path })),
    ...collageRows.map((row) => ({ id: `collage:${row.id}`, path: row.storage_path })),
    ...rankingRows.map((row) => ({ id: `rank:${row.id}`, path: row.storage_path })),
  ]);

  const ranked = rankMemeImages(
    rankingRows.map((row) => ({
      id: row.id,
      totalVotes: row.total_votes,
      totalPoints: row.total_points,
      firstPlaceCount: row.first_place_count,
      secondPlaceCount: row.second_place_count,
      thirdPlaceCount: row.third_place_count,
      authorFirstName: revealAuthors ? authorNames.get(row.student_id) ?? null : null,
      url: urls.get(`rank:${row.id}`) ?? '',
    })),
  ).filter((entry) => entry.url);

  const overview: MemeBattleOverview = {
    serverNow: new Date().toISOString(),
    event: {
      name: event.name,
      tagline: event.tagline,
      description: event.description,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      phase,
      maxImages: event.max_images_per_student,
    },
    myImages: mineRows
      .map((row) => ({
        id: row.id,
        url: urls.get(row.id) ?? '',
        createdAt: row.created_at,
      }))
      .filter((row) => row.url),
    ratingsGiven: votesResult.count ?? 0,
    roundsCompleted: roundsResult.count ?? 0,
    activeImageCount: activeCountResult.count ?? 0,
    voteQuota: {
      ownActiveImages: mineRows.length,
      roundsCompleted: roundsResult.count ?? 0,
      maxRounds: maxVoteRoundsForOwnImages(mineRows.length),
      unlimited: maxVoteRoundsForOwnImages(mineRows.length) == null,
    },
    collage: collageRows
      .map((row) => ({ id: row.id, url: urls.get(`collage:${row.id}`) ?? '' }))
      .filter((row) => row.url),
    ranking: ranked.map((entry) => ({
      id: entry.id,
      url: entry.url,
      totalVotes: entry.totalVotes,
      firstPlaceCount: entry.firstPlaceCount,
      secondPlaceCount: entry.secondPlaceCount,
      thirdPlaceCount: entry.thirdPlaceCount,
      totalPoints: entry.totalPoints,
      averagePoints: entry.averagePoints,
      authorFirstName: entry.authorFirstName,
    })),
  };

  return { ok: true, data: overview };
}

async function loadRoundImages(
  client: SupabaseClient,
  roundId: string,
): Promise<Result<{ id: string; path: string }[]>> {
  const { data, error } = await client
    .from('meme_rating_round_items')
    .select('image_id, slot_index')
    .eq('round_id', roundId)
    .order('slot_index', { ascending: true });

  if (error) return { ok: false, code: 'unavailable', error: error.message };
  if (!data || data.length === 0) return { ok: false, code: 'round_void' };

  const items = data as { image_id: string }[];
  const { data: imageRows, error: imageError } = await client
    .from('meme_images')
    .select('id, storage_path, is_active')
    .in(
      'id',
      items.map((item) => item.image_id),
    );

  if (imageError || !imageRows) {
    return { ok: false, code: 'unavailable', error: imageError?.message };
  }

  const byId = new Map(
    (imageRows as { id: string; storage_path: string; is_active: boolean }[]).map((row) => [row.id, row]),
  );

  const images = items.flatMap((item) => {
    const image = byId.get(item.image_id);
    if (!image?.is_active || !image.storage_path) return [];
    return [{ id: item.image_id, path: image.storage_path }];
  });

  if (images.length !== items.length) return { ok: false, code: 'round_void' };
  return { ok: true, data: images };
}

async function toRoundPayload(
  client: SupabaseClient,
  roundId: string,
  roundNumber: number,
): Promise<Result<MemeRoundPayload>> {
  const loaded = await loadRoundImages(client, roundId);
  if (!loaded.ok && loaded.code !== 'round_void') {
    return { ok: false, code: loaded.code, error: loaded.error };
  }

  if (!loaded.ok) {
    await client
      .from('meme_rating_rounds')
      .update({ voided_at: new Date().toISOString() })
      .eq('id', roundId)
      .is('completed_at', null)
      .is('voided_at', null);
    return { ok: false, code: 'round_void' };
  }

  const images = loaded.data;

  const urls = await signedUrlMap(client, images);
  if (images.some((image) => !urls.get(image.id))) {
    return { ok: false, code: 'unavailable' };
  }

  return {
    ok: true,
    data: {
      roundId,
      roundNumber,
      images: images.map((image) => ({
        id: image.id,
        url: urls.get(image.id) ?? '',
      })),
    },
  };
}

const PREPARED_ROUND_MAX_MS = 12 * 60 * 60 * 1000;

function preparedRoundIsFresh(createdAt: string): boolean {
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && Date.now() - created < PREPARED_ROUND_MAX_MS;
}

async function findMemeRound(
  client: SupabaseClient,
  eventId: string,
  studentId: string,
  prepared: boolean,
): Promise<{ id: string; createdAt: string } | null> {
  let query = client
    .from('meme_rating_rounds')
    .select('id, created_at')
    .eq('event_id', eventId)
    .eq('student_id', studentId)
    .is('completed_at', null)
    .is('voided_at', null);
  query = prepared ? query.is('activated_at', null) : query.not('activated_at', 'is', null);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; created_at: string };
  return { id: row.id, createdAt: row.created_at };
}

async function loadRoundImageIds(client: SupabaseClient, roundId: string): Promise<string[]> {
  const { data } = await client
    .from('meme_rating_round_items')
    .select('image_id')
    .eq('round_id', roundId);
  return ((data ?? []) as { image_id: string }[]).map((row) => row.image_id);
}

export async function openOrCreateMemeRound(
  studentId: string,
  mode: 'current' | 'prepare' = 'current',
): Promise<Result<MemeRoundPayload>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, code: 'unavailable' };
  }

  const client = createSupabaseAdminClient();
  const eventResult = await loadEvent(client);
  if (!eventResult.ok) return { ok: false, code: eventResult.code };
  if (!eventResult.data) return { ok: false, code: 'no_event' };

  const event = eventResult.data;
  if (phaseOf(event) !== 'active') {
    return { ok: false, code: phaseOf(event) === 'scheduled' ? 'event_scheduled' : 'event_closed' };
  }

  const completed = await client
    .from('meme_rating_rounds')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('student_id', studentId)
    .not('completed_at', 'is', null);

  const active = await findMemeRound(client, event.id, studentId, false);
  const prepared = await findMemeRound(client, event.id, studentId, true);
  const roundNumber = (completed.count ?? 0) + (mode === 'prepare' && active ? 2 : 1);

  if (mode === 'current' && active) {
    const openPayload = await toRoundPayload(client, active.id, roundNumber);
    if (openPayload.ok || openPayload.code !== 'round_void') return openPayload;
  }

  if (mode === 'prepare' && prepared && preparedRoundIsFresh(prepared.createdAt)) {
    const preparedPayload = await toRoundPayload(client, prepared.id, roundNumber);
    if (preparedPayload.ok || preparedPayload.code !== 'round_void') return preparedPayload;
  }

  if (mode === 'prepare' && prepared && !preparedRoundIsFresh(prepared.createdAt)) {
    await client.rpc('release_prepared_meme_round', {
      p_student_id: studentId,
      p_round_id: prepared.id,
    });
  }

  const ownActiveResult = await client
    .from('meme_images')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('student_id', studentId)
    .eq('is_active', true);
  const ownActiveImages = ownActiveResult.count ?? 0;
  const preparedAfterCleanup = await findMemeRound(client, event.id, studentId, true);
  const hasFreshPrepared = Boolean(
    preparedAfterCleanup && preparedRoundIsFresh(preparedAfterCleanup.createdAt),
  );

  // For `current`, SQL may promote an existing prepared round or deny it.
  // Skip the early gate so that over-limit prepared can be released cleanly.
  if (
    !(mode === 'current' && !active) &&
    !canCreateVoteRound({
      ownActiveImages,
      completed: completed.count ?? 0,
      hasActive: Boolean(active),
      hasPrepared: hasFreshPrepared,
      mode,
    })
  ) {
    return { ok: false, code: 'vote_limit' };
  }

  const blocked = new Set(mode === 'prepare' && active ? await loadRoundImageIds(client, active.id) : []);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const existing =
      mode === 'prepare'
        ? await findMemeRound(client, event.id, studentId, true)
        : await findMemeRound(client, event.id, studentId, false);
    if (existing && (mode === 'current' || preparedRoundIsFresh(existing.createdAt))) {
      const payload = await toRoundPayload(client, existing.id, roundNumber);
      if (payload.ok || payload.code !== 'round_void') return payload;
    }

    const [imagesResult, votesResult, seenResult] = await Promise.all([
      client
        .from('meme_images')
        .select('id, student_id, participation_count')
        .eq('event_id', event.id)
        .eq('is_active', true),
      client
        .from('meme_image_votes')
        .select('image_id')
        .eq('event_id', event.id)
        .eq('student_id', studentId),
      client
        .from('meme_rating_rounds')
        .select('image_set_key')
        .eq('event_id', event.id)
        .eq('student_id', studentId)
        .is('voided_at', null),
    ]);

    const queryError = imagesResult.error ?? votesResult.error ?? seenResult.error;
    if (queryError) {
      logRepositoryFailure('openOrCreateMemeRound', queryError.message);
      return { ok: false, code: 'unavailable', error: queryError.message };
    }

    const voted = new Set(
      ((votesResult.data ?? []) as { image_id: string }[]).map((row) => row.image_id),
    );
    const candidates = eligibleMemeCandidates(
      ((imagesResult.data ?? []) as {
        id: string;
        student_id: string;
        participation_count: number;
      }[]).map((row) => ({
        id: row.id,
        studentId: row.student_id,
        participationCount: row.participation_count,
      })),
      studentId,
      voted,
    ).filter((candidate) => !blocked.has(candidate.id));

    if (candidates.length < 3) return { ok: false, code: 'not_enough' };

    const seen = new Set(
      ((seenResult.data ?? []) as { image_set_key: string }[])
        .map((row) => row.image_set_key)
        .filter(Boolean),
    );
    const triple = selectBalancedTriple(candidates, seen);
    if (!triple) return { ok: false, code: 'no_fresh' };

    const { data, error } = await client.rpc('commit_meme_rating_round', {
      p_student_id: studentId,
      p_image_ids: triple,
      p_prepare: mode === 'prepare',
    });

    if (error) {
      logRepositoryFailure('commit_meme_rating_round', error.message);
      return { ok: false, code: 'unavailable', error: error.message };
    }

    const payload = (data ?? {}) as RpcPayload;
    if (payload.ok && payload.roundId) {
      const signed = await toRoundPayload(client, payload.roundId, roundNumber);
      if (signed.ok) return signed;
      if (signed.code !== 'round_void') return signed;
      continue;
    }
    if (payload.code && payload.code !== 'retry') {
      return { ok: false, code: payload.code };
    }
  }

  return { ok: false, code: 'no_fresh' };
}

export async function releasePreparedMemeRound(
  studentId: string,
  roundId: string,
): Promise<Result<{ released: true }>> {
  if (!isSupabaseConfiguredOnServer()) return { ok: false, code: 'unavailable' };
  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc('release_prepared_meme_round', {
    p_student_id: studentId,
    p_round_id: roundId,
  });
  if (error) {
    logRepositoryFailure('release_prepared_meme_round', error.message);
    return { ok: false, code: 'unavailable', error: error.message };
  }
  const payload = (data ?? {}) as RpcPayload;
  if (!payload.ok) return { ok: false, code: payload.code ?? 'unavailable' };
  return { ok: true, data: { released: true } };
}

export async function activatePreparedMemeRound(
  studentId: string,
  roundId: string,
): Promise<Result<{ active: true }>> {
  if (!isSupabaseConfiguredOnServer()) return { ok: false, code: 'unavailable' };
  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc('activate_prepared_meme_round', {
    p_student_id: studentId,
    p_round_id: roundId,
  });
  if (error) {
    logRepositoryFailure('activate_prepared_meme_round', error.message);
    return { ok: false, code: 'unavailable', error: error.message };
  }
  const payload = (data ?? {}) as RpcPayload;
  if (!payload.ok) {
    if (payload.code === 'vote_limit') return { ok: false, code: 'vote_limit' };
    return { ok: false, code: payload.code ?? 'retry' };
  }
  return { ok: true, data: { active: true } };
}

export async function submitMemeRound(
  studentId: string,
  roundId: string,
  placements: MemePlacement[],
): Promise<Result<{ ratingsGiven: number }>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, code: 'unavailable' };
  }

  const client = createSupabaseAdminClient();
  const { data: items, error: itemsError } = await client
    .from('meme_rating_round_items')
    .select('image_id')
    .eq('round_id', roundId);

  if (itemsError) {
    return { ok: false, code: 'unavailable', error: itemsError.message };
  }

  const roundImageIds = ((items ?? []) as { image_id: string }[]).map((item) => item.image_id);
  if (!placementsAreValid(roundImageIds, placements)) {
    return { ok: false, code: 'invalid_places' };
  }

  const { data, error } = await client.rpc('submit_meme_rating_round', {
    p_student_id: studentId,
    p_round_id: roundId,
    p_places: placements,
  });

  if (error) {
    logRepositoryFailure('submit_meme_rating_round', error.message);
    return { ok: false, code: 'unavailable', error: error.message };
  }

  const payload = (data ?? {}) as RpcPayload;
  if (!payload.ok) return { ok: false, code: payload.code ?? 'unavailable' };

  const eventResult = await loadEvent(client);
  if (!eventResult.ok || !eventResult.data) {
    return { ok: true, data: { ratingsGiven: placements.length } };
  }

  const votes = await client
    .from('meme_image_votes')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventResult.data.id)
    .eq('student_id', studentId);

  return { ok: true, data: { ratingsGiven: votes.count ?? placements.length } };
}

export async function uploadMemeImage(
  studentId: string,
  bytes: Uint8Array,
): Promise<Result<{ imageId: string }>> {
  const validated = validateMemeImageBytes(bytes);
  if (!validated.ok) return validated;

  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, code: 'unavailable' };
  }

  const client = createSupabaseAdminClient();
  const eventResult = await loadEvent(client);
  if (!eventResult.ok) return { ok: false, code: eventResult.code };
  if (!eventResult.data) return { ok: false, code: 'no_event' };
  if (phaseOf(eventResult.data) !== 'active') {
    return {
      ok: false,
      code: phaseOf(eventResult.data) === 'scheduled' ? 'event_scheduled' : 'event_closed',
    };
  }

  const imageId = crypto.randomUUID();
  const storagePath = `${eventResult.data.id}/${studentId}/${imageId}.${validated.extension}`;
  const uploaded = await client.storage.from(MEME_BATTLE_BUCKET).upload(storagePath, bytes, {
    contentType: validated.mime,
    upsert: false,
  });

  if (uploaded.error) {
    logRepositoryFailure('uploadMemeImage', uploaded.error.message);
    return { ok: false, code: 'unavailable', error: uploaded.error.message };
  }

  const { data, error } = await client.rpc('register_meme_image', {
    p_student_id: studentId,
    p_storage_path: storagePath,
    p_mime_type: validated.mime,
    p_byte_size: bytes.byteLength,
  });

  if (error || !(data as RpcPayload | null)?.ok) {
    await client.storage.from(MEME_BATTLE_BUCKET).remove([storagePath]);
    if (error) {
      logRepositoryFailure('register_meme_image', error.message);
      return { ok: false, code: 'unavailable', error: error.message };
    }
    const code = (data as RpcPayload | null)?.code;
    return { ok: false, code: code && code !== 'retry' ? code : 'unavailable' };
  }

  return { ok: true, data: { imageId: (data as RpcPayload).imageId ?? imageId } };
}

export async function deactivateOwnedMemeImage(
  studentId: string,
  imageId: string,
): Promise<Result<{ removed: true }>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, code: 'unavailable' };
  }

  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc('deactivate_meme_image', {
    p_student_id: studentId,
    p_image_id: imageId,
  });

  if (error) {
    logRepositoryFailure('deactivate_meme_image', error.message);
    return { ok: false, code: 'unavailable', error: error.message };
  }

  const payload = (data ?? {}) as RpcPayload;
  if (!payload.ok) return { ok: false, code: payload.code ?? 'not_found' };

  if (payload.storagePath) {
    const removed = await client.storage.from(MEME_BATTLE_BUCKET).remove([payload.storagePath]);
    if (removed.error) {
      logRepositoryFailure('deactivateOwnedMemeImage.storage', removed.error.message);
    }
  }

  return { ok: true, data: { removed: true } };
}

type AdminImageRow = {
  id: string;
  student_id: string;
  storage_path: string;
  created_at: string;
  participation_count: number;
  total_votes: number;
  total_points: number;
  is_active: boolean;
};

export async function fetchAdminMemeGallery(): Promise<Result<AdminMemeStudentGroup[]>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, code: 'unavailable' };
  }

  const client = createSupabaseAdminClient();
  const eventResult = await loadEvent(client);
  if (!eventResult.ok) return { ok: false, code: eventResult.code };
  if (!eventResult.data) return { ok: true, data: [] };

  const event = eventResult.data;
  const { data, error } = await client
    .from('meme_images')
    .select(
      'id, student_id, storage_path, created_at, participation_count, total_votes, total_points, is_active',
    )
    .eq('event_id', event.id)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingRelation(error)) return { ok: true, data: [] };
    logRepositoryFailure('fetchAdminMemeGallery', error.message);
    return { ok: false, code: 'unavailable', error: error.message };
  }

  const rows = (data ?? []) as AdminImageRow[];
  if (rows.length === 0) return { ok: true, data: [] };

  const studentIds = [...new Set(rows.map((row) => row.student_id))];
  const { data: studentRows, error: studentError } = await client
    .from('students')
    .select('id, name, first_name, last_name')
    .in('id', studentIds);

  if (studentError) {
    logRepositoryFailure('fetchAdminMemeGallery.students', studentError.message);
    return { ok: false, code: 'unavailable', error: studentError.message };
  }

  const names = new Map<string, string>();
  for (const row of (studentRows ?? []) as {
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
  }[]) {
    const full = row.name?.trim() || [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
    names.set(row.id, full || 'Ученик');
  }

  const urls = await signedUrlMap(
    client,
    rows
      .filter((row) => row.is_active && row.storage_path)
      .map((row) => ({ id: row.id, path: row.storage_path })),
  );

  const groups = new Map<string, AdminMemeStudentGroup>();
  for (const row of rows) {
    const group = groups.get(row.student_id) ?? {
      studentId: row.student_id,
      name: names.get(row.student_id) ?? 'Ученик',
      activeCount: 0,
      maxImages: event.max_images_per_student,
      images: [],
    };
    if (row.is_active) group.activeCount += 1;
    group.images.push({
      id: row.id,
      url: row.is_active ? urls.get(row.id) ?? null : null,
      createdAt: row.created_at,
      participationCount: row.participation_count,
      totalVotes: row.total_votes,
      averagePoints: averageMemePoints(row.total_points, row.total_votes),
      isActive: row.is_active,
    });
    groups.set(row.student_id, group);
  }

  return {
    ok: true,
    data: [...groups.values()].sort((left, right) => left.name.localeCompare(right.name, 'ru')),
  };
}

export async function adminHideMemeImage(
  imageId: string,
): Promise<Result<{ removed: true }>> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, code: 'unavailable' };
  }

  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc('admin_hide_meme_image', {
    p_image_id: imageId,
  });

  if (error) {
    logRepositoryFailure('admin_hide_meme_image', error.message);
    return { ok: false, code: 'unavailable', error: error.message };
  }

  const payload = (data ?? {}) as RpcPayload;
  if (!payload.ok) return { ok: false, code: payload.code ?? 'not_found' };

  if (payload.storagePath) {
    const removed = await client.storage.from(MEME_BATTLE_BUCKET).remove([payload.storagePath]);
    if (removed.error) {
      logRepositoryFailure('adminHideMemeImage.storage', removed.error.message);
    }
  }

  return { ok: true, data: { removed: true } };
}
