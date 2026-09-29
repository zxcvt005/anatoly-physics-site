import assert from 'node:assert/strict';
import {
  eligibleMemeCandidates,
  imageSetKey,
  poolHasUnseenTriple,
  selectBalancedTriple,
} from '../src/lib/meme-battle/balanced-sample';
import { detectImageMime, validateMemeImageBytes } from '../src/lib/meme-battle/images';
import { averageMemePoints, memeTopFiveState, pointsForPlace, rankMemeImages } from '../src/lib/meme-battle/ranking';
import { formatRemaining, memeEventPhase, ruPlural } from '../src/lib/meme-battle/time';
import { placementsAreValid } from '../src/lib/meme-battle/voting';

import { MEME_BATTLE_MAX_BYTES } from '../src/lib/meme-battle/constants';
import {
  MEME_PREPARE_KEEP_ORIGINAL_BYTES,
  MEME_PREPARE_MAX_EDGE,
  MEME_PREPARE_TARGET_BYTES,
  MEME_REENCODE_STEPS,
  fittedSize,
  planMemeUpload,
} from '../src/lib/meme-battle/prepare-upload';
import {
  MEME_UPLOAD_CONCURRENCY,
  createLimiter,
  formatByteSize,
  limitSelectionMessage,
  takeWithinSlots,
  uploadBatchHeadline,
  uploadButtonLabel,
} from '../src/lib/meme-battle/upload-batch';
import {
  canActivatePreparedRound,
  canCreateVoteRound,
  maxVoteRoundsForOwnImages,
  voteLimitCopy,
  voteRoundProgressLabel,
  voteSlotsOccupied,
} from '../src/lib/meme-battle/vote-quota';
import { VOTE_SAVED_CODES, VOTE_STOP_CODES } from '../src/components/meme-battle/meme-round-client';

const errors: string[] = [];
let passed = 0;
const pending: Promise<void>[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      pending.push(
        result.then(
          () => {
            passed += 1;
          },
          (error: unknown) => {
            errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
          },
        ),
      );
      return;
    }
    passed += 1;
  } catch (error) {
    errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

const balancedPool = [
  { id: 'A', participationCount: 10 },
  { id: 'B', participationCount: 10 },
  { id: 'C', participationCount: 9 },
  { id: 'D', participationCount: 8 },
  { id: 'E', participationCount: 8 },
  { id: 'F', participationCount: 7 },
];

test('balanced sample draws from the least-shown band, not the whole catalog', () => {
  for (let seed = 1; seed <= 24; seed += 1) {
    const triple = selectBalancedTriple(balancedPool, new Set(), mulberry32(seed));
    assert.deepEqual(triple ? [...triple].sort() : null, ['D', 'E', 'F']);
  }
});

test('a seen low-count triple widens the band but stays off heavily shown images', () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const triple = selectBalancedTriple(balancedPool, new Set(['D|E|F']), mulberry32(seed));
    assert.ok(triple);
    assert.equal(triple?.includes('C'), true);
    assert.equal(triple?.some((id) => id === 'A' || id === 'B'), false);
    assert.notEqual(imageSetKey(triple ?? []), 'D|E|F');
  }
});

test('equal counts stay random instead of always returning the first three ids', () => {
  const candidates = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({
    id,
    participationCount: 2,
  }));
  const keys = new Set<string>();
  for (let seed = 1; seed <= 40; seed += 1) {
    const triple = selectBalancedTriple(candidates, new Set(), mulberry32(seed));
    assert.equal(triple?.length, 3);
    if (triple) keys.add(imageSetKey(triple));
  }
  assert.ok(keys.size > 1);
});

test('fewer than three eligible images cannot form a round', () => {
  assert.equal(
    selectBalancedTriple(
      [
        { id: 'a', participationCount: 0 },
        { id: 'b', participationCount: 0 },
      ],
      new Set(),
    ),
    null,
  );
});

test('when every remaining triple was already shown, nothing new is issued', () => {
  const candidates = [
    { id: 'a', participationCount: 1 },
    { id: 'b', participationCount: 1 },
    { id: 'c', participationCount: 1 },
  ];
  assert.equal(selectBalancedTriple(candidates, new Set(['a|b|c']), mulberry32(1)), null);
  assert.equal(poolHasUnseenTriple(['a', 'b', 'c'], new Set(['a|b|c'])), false);
  assert.equal(poolHasUnseenTriple(['a', 'b', 'c', 'd'], new Set(['a|b|c'])), true);
});

test('own and already voted images never enter the pool', () => {
  const eligible = eligibleMemeCandidates(
    [
      { id: 'own', studentId: 'me', participationCount: 0 },
      { id: 'voted', studentId: 'other', participationCount: 0 },
      { id: 'fresh', studentId: 'other', participationCount: 4 },
    ],
    'me',
    new Set(['voted']),
  );
  assert.deepEqual(
    eligible.map((item) => item.id),
    ['fresh'],
  );
});

test('ranking uses average points and breaks ties by number of votes', () => {
  const ranked = rankMemeImages([
    { id: 'one-vote', totalVotes: 1, totalPoints: 3, firstPlaceCount: 1, secondPlaceCount: 0, thirdPlaceCount: 0 },
    { id: 'many', totalVotes: 4, totalPoints: 12, firstPlaceCount: 4, secondPlaceCount: 0, thirdPlaceCount: 0 },
    { id: 'weaker', totalVotes: 5, totalPoints: 10, firstPlaceCount: 0, secondPlaceCount: 5, thirdPlaceCount: 0 },
    { id: 'silent', totalVotes: 0, totalPoints: 0, firstPlaceCount: 0, secondPlaceCount: 0, thirdPlaceCount: 0 },
  ]);
  assert.deepEqual(
    ranked.map((item) => item.id),
    ['many', 'one-vote', 'weaker'],
  );
  assert.equal(averageMemePoints(12, 4), 3);
  assert.equal(pointsForPlace(1), 3);
  assert.equal(pointsForPlace(2), 2);
  assert.equal(pointsForPlace(3), 1);
  assert.equal(pointsForPlace(4), null);
});

test('top 5 stays on the existing average and has its own empty states', () => {
  assert.equal(memeTopFiveState(3, 0), 'too_few_images');
  assert.equal(memeTopFiveState(2, 2), 'too_few_images');
  assert.equal(memeTopFiveState(5, 0), 'too_early');
  assert.equal(memeTopFiveState(8, 1), 'ready');
  const ranked = rankMemeImages([
    { id: 'low', totalVotes: 4, totalPoints: 6, firstPlaceCount: 0, secondPlaceCount: 1, thirdPlaceCount: 3 },
    { id: 'high', totalVotes: 2, totalPoints: 6, firstPlaceCount: 2, secondPlaceCount: 0, thirdPlaceCount: 0 },
  ]);
  assert.deepEqual(ranked.slice(0, 5).map((item) => item.id), ['high', 'low']);
  assert.equal(ranked[0]?.averagePoints, averageMemePoints(6, 2));
});

test('a vote must place exactly the round images into 1, 2 and 3', () => {
  const images = ['a', 'b', 'c'];
  assert.equal(
    placementsAreValid(images, [
      { imageId: 'a', place: 1 },
      { imageId: 'b', place: 2 },
      { imageId: 'c', place: 3 },
    ]),
    true,
  );
  assert.equal(
    placementsAreValid(images, [
      { imageId: 'a', place: 1 },
      { imageId: 'b', place: 1 },
      { imageId: 'c', place: 2 },
    ]),
    false,
  );
  assert.equal(
    placementsAreValid(images, [
      { imageId: 'a', place: 1 },
      { imageId: 'own', place: 2 },
      { imageId: 'c', place: 3 },
    ]),
    false,
  );
});

test('countdown and event phase follow the configured window', () => {
  const start = Date.parse('2026-09-28T12:00:00.000Z');
  const end = start + 10 * 24 * 60 * 60 * 1000;
  assert.equal(memeEventPhase(new Date(start).toISOString(), new Date(end).toISOString(), start - 1), 'scheduled');
  assert.equal(memeEventPhase(new Date(start).toISOString(), new Date(end).toISOString(), start + 1000), 'active');
  assert.equal(memeEventPhase(new Date(start).toISOString(), new Date(end).toISOString(), end), 'ended');

  const nineDaysFourteenHours = (9 * 24 + 14) * 60 * 60 * 1000;
  assert.equal(formatRemaining(new Date(nineDaysFourteenHours).toISOString(), 0), 'Осталось 9 дней 14 часов');
  assert.equal(ruPlural(21, 'оценка', 'оценки', 'оценок'), 'оценка');
  assert.equal(ruPlural(11, 'день', 'дня', 'дней'), 'дней');
});

test('uploads accept real image signatures and reject the rest', () => {
  assert.equal(detectImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
  assert.equal(validateMemeImageBytes(Uint8Array.from([0xff, 0xd8, 0xff])).ok, true);
  assert.equal(validateMemeImageBytes(Uint8Array.from([0x3c, 0x73, 0x76, 0x67])).ok, false);
  assert.equal(validateMemeImageBytes(new Uint8Array()).ok, false);
});

test('a phone-sized photo is reencoded and a small meme is left as-is', () => {
  assert.equal(
    planMemeUpload({ bytes: 4.6 * 1024 * 1024, maxEdge: 4032, mime: 'image/jpeg' }),
    'reencode',
  );
  assert.equal(
    planMemeUpload({ bytes: 180 * 1024, maxEdge: 900, mime: 'image/png' }),
    'keep-small',
  );
  assert.equal(planMemeUpload({ bytes: 900 * 1024, maxEdge: null, mime: null }), 'reencode');
  assert.equal(planMemeUpload({ bytes: 400 * 1024, maxEdge: 600, mime: 'image/gif' }), 'keep-gif');
  assert.equal(planMemeUpload({ bytes: MEME_BATTLE_MAX_BYTES + 1, maxEdge: 1000, mime: 'image/jpeg' }), 'reject-size');
  assert.equal(MEME_REENCODE_STEPS[0]?.maxEdge, MEME_PREPARE_MAX_EDGE);
  assert.ok(MEME_REENCODE_STEPS[0] && MEME_REENCODE_STEPS[0].quality >= 0.78);
  assert.equal(MEME_REENCODE_STEPS.at(-1)?.maxEdge, 1600);
  assert.equal(MEME_PREPARE_TARGET_BYTES, 1024 * 1024);
  assert.ok(MEME_PREPARE_KEEP_ORIGINAL_BYTES < 500 * 1024);
});

test('resize keeps aspect ratio and does not enlarge a small image', () => {
  assert.deepEqual(fittedSize(4032, 3024, 1920), { width: 1920, height: 1440 });
  assert.deepEqual(fittedSize(800, 600, 1920), { width: 800, height: 600 });
  assert.deepEqual(fittedSize(1080, 1920, 1920), { width: 1080, height: 1920 });
});

test('selecting more files than free slots trims before upload', () => {
  const files = ['a', 'b', 'c', 'd'];
  assert.deepEqual(takeWithinSlots(files, 2), { accepted: ['a', 'b'], overflow: 2 });
  assert.deepEqual(takeWithinSlots(files, 0), { accepted: [], overflow: 4 });
  assert.equal(limitSelectionMessage(2), 'Можно добавить только 2 картинки. Выбери не больше 2.');
  assert.equal(uploadButtonLabel(4), 'Загрузить 4 картинки');
  assert.equal(formatByteSize(4.2 * 1024 * 1024), '4.2 МБ');
  assert.equal(formatByteSize(640 * 1024), '640 КБ');
});

test('upload progress copy follows preparation and real batch state', () => {
  assert.equal(
    uploadBatchHeadline([
      { status: 'ready' },
      { status: 'ready' },
      { status: 'preparing' },
    ]),
    'Подготовка 3 из 3',
  );
  assert.equal(
    uploadBatchHeadline([
      { status: 'uploading' },
      { status: 'uploading' },
      { status: 'queued' },
      { status: 'queued' },
    ]),
    'Загрузка 2 из 4',
  );
  assert.equal(
    uploadBatchHeadline([
      { status: 'done' },
      { status: 'done' },
      { status: 'uploading' },
      { status: 'queued' },
    ]),
    'Загружено 2 из 4',
  );
  assert.equal(
    uploadBatchHeadline([
      { status: 'done' },
      { status: 'done' },
      { status: 'done' },
      { status: 'done' },
    ]),
    'Все 4 картинки загружены',
  );
  assert.equal(
    uploadBatchHeadline([
      { status: 'done' },
      { status: 'done' },
      { status: 'error' },
    ]),
    'Загружено 2 из 3',
  );
  assert.equal(
    uploadBatchHeadline([
      { status: 'error' },
      { status: 'error' },
    ]),
    'Загружено 0 из 2',
  );
});

test('parallel upload stays at two files and a failed one does not cancel the rest', async () => {
  assert.equal(MEME_UPLOAD_CONCURRENCY, 2);
  const limit = createLimiter(MEME_UPLOAD_CONCURRENCY);
  let active = 0;
  let peak = 0;
  const finished: string[] = [];

  await Promise.all(
    ['a', 'b', 'c', 'd', 'e'].map((name) =>
      limit(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 15));
        active -= 1;
        if (name === 'c') return;
        finished.push(name);
      }),
    ),
  );

  assert.equal(peak, 2);
  assert.deepEqual(finished.sort(), ['a', 'b', 'd', 'e']);
});

test('vote stop codes cover voided and already-saved rounds', () => {
  assert.equal(VOTE_STOP_CODES.has('round_void'), true);
  assert.equal(VOTE_STOP_CODES.has('invalid_image'), true);
  assert.equal(VOTE_SAVED_CODES.has('already_completed'), true);
  assert.equal(VOTE_STOP_CODES.has('already_completed'), false);
});

test('vote quota grows with own active images and becomes unlimited at 3', () => {
  assert.equal(maxVoteRoundsForOwnImages(0), 1);
  assert.equal(maxVoteRoundsForOwnImages(1), 2);
  assert.equal(maxVoteRoundsForOwnImages(2), 3);
  assert.equal(maxVoteRoundsForOwnImages(3), null);
  assert.equal(maxVoteRoundsForOwnImages(5), null);
  assert.equal(voteSlotsOccupied({ completed: 1, hasActive: true, hasPrepared: true }), 3);
  assert.equal(
    canCreateVoteRound({
      ownActiveImages: 0,
      completed: 0,
      hasActive: true,
      hasPrepared: false,
      mode: 'prepare',
    }),
    false,
  );
  assert.equal(
    canCreateVoteRound({
      ownActiveImages: 1,
      completed: 0,
      hasActive: true,
      hasPrepared: false,
      mode: 'prepare',
    }),
    true,
  );
  assert.equal(
    canCreateVoteRound({
      ownActiveImages: 0,
      completed: 1,
      hasActive: false,
      hasPrepared: false,
      mode: 'current',
    }),
    false,
  );
  assert.equal(
    canActivatePreparedRound({ ownActiveImages: 0, completed: 1 }),
    false,
  );
  assert.equal(
    canActivatePreparedRound({ ownActiveImages: 1, completed: 1 }),
    true,
  );
  assert.equal(
    voteRoundProgressLabel({ ownActiveImages: 0, roundsCompleted: 0, hasCurrentRound: true }),
    'Раунд 1 из 1',
  );
  assert.equal(
    voteRoundProgressLabel({ ownActiveImages: 2, roundsCompleted: 1, hasCurrentRound: true }),
    'Раунд 2 из 3',
  );
  assert.equal(
    voteRoundProgressLabel({ ownActiveImages: 3, roundsCompleted: 10, hasCurrentRound: true }),
    'Без ограничений',
  );
  assert.equal(voteLimitCopy(0).title, 'Хочешь ещё?');
  assert.equal(voteLimitCopy(1).title, 'Ещё один раунд доступен');
});

async function finishMemeBattleChecks(): Promise<void> {
  await Promise.all(pending);
  if (errors.length > 0) {
    console.error('verify-meme-battle failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`verify-meme-battle passed (${passed} tests)`);
}

void finishMemeBattleChecks();
