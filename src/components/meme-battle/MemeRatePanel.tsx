'use client';

import { useEffect, useRef, useState } from 'react';
import { memeBattleErrorText } from '@/lib/meme-battle/messages';
import type { MemeBattleOverview, MemeEventPhase, MemePlacement, MemeRoundPayload } from '@/lib/meme-battle/types';
import { ruPlural } from '@/lib/meme-battle/time';
import { canActivatePreparedRound, voteLimitCopy, voteRoundProgressLabel } from '@/lib/meme-battle/vote-quota';
import { MemeFitImage } from './MemeFitImage';
import {
  VOTE_STOP_CODES,
  activateMemeRound,
  preloadMemeImages,
  releasePreparedKeepalive,
  requestMemeRound,
  sendVoteKeepalive,
  submitMemeVote,
  wait,
} from './meme-round-client';

const PLACE_LABELS = [
  { place: 1, medal: '1', title: 'Самая смешная' },
  { place: 2, medal: '2', title: 'Тоже ничего' },
  { place: 3, medal: '3', title: 'Менее смешная' },
] as const;

const CHEERS = [
  'Принято. Следующая тройка.',
  'Вот это уже спорно.',
  'Ты помог собрать ещё одну оценку.',
];

type PendingVote = {
  roundId: string;
  placements: MemePlacement[];
  attempts: number;
};

type VoteQuota = MemeBattleOverview['voteQuota'];

export function MemeRatePanel({
  token,
  phase,
  ratingsGiven,
  roundsCompleted,
  voteQuota,
  onVoted,
  onAddImages,
}: {
  token: string;
  phase: MemeEventPhase;
  ratingsGiven: number;
  roundsCompleted: number;
  voteQuota: VoteQuota;
  onVoted: () => Promise<void>;
  onAddImages: () => void;
}) {
  const [round, setRound] = useState<MemeRoundPayload | null>(null);
  const [nextRound, setNextRound] = useState<MemeRoundPayload | null>(null);
  const [places, setPlaces] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cheer, setCheer] = useState<string | null>(null);
  const [loading, setLoading] = useState(phase === 'active');
  const [waitingNext, setWaitingNext] = useState(false);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [gated, setGated] = useState(false);
  const votesRef = useRef<PendingVote[]>([]);
  const flushingRef = useRef(false);
  const shownRef = useRef<string | null>(null);
  const nextRef = useRef<string | null>(null);
  const waitingRef = useRef(false);
  const onVotedRef = useRef(onVoted);
  const quotaRef = useRef(voteQuota);

  useEffect(() => {
    onVotedRef.current = onVoted;
  }, [onVoted]);

  useEffect(() => {
    quotaRef.current = voteQuota;
  }, [voteQuota]);

  function rememberNext(payload: MemeRoundPayload | null) {
    nextRef.current = payload && payload.roundId !== shownRef.current ? payload.roundId : null;
    setNextRound(payload && payload.roundId !== shownRef.current ? payload : null);
  }

  function enterGate() {
    const hidden = nextRef.current;
    if (hidden && hidden !== shownRef.current) {
      releasePreparedKeepalive(token, hidden);
    }
    nextRef.current = null;
    shownRef.current = null;
    waitingRef.current = false;
    setNextRound(null);
    setWaitingNext(false);
    setLockedId(null);
    setRound(null);
    setPlaces({});
    setCheer(null);
    setMessage(null);
    setGated(true);
    setLoading(false);
  }

  function showPrepared(payload: MemeRoundPayload) {
    nextRef.current = null;
    shownRef.current = payload.roundId;
    waitingRef.current = false;
    setWaitingNext(false);
    setNextRound(null);
    setPlaces({});
    setMessage(null);
    setLockedId(null);
    setGated(false);
    setRound(payload);
    setCheer(CHEERS[roundsCompleted % CHEERS.length] ?? CHEERS[0]);
    window.setTimeout(() => setCheer(null), 1200);
  }

  function publishPrepared(payload: MemeRoundPayload) {
    if (payload.roundId === shownRef.current) return;
    const quota = quotaRef.current;
    const completedAfterCurrent = roundsCompleted + (shownRef.current ? 1 : 0);
    if (
      waitingRef.current &&
      !canActivatePreparedRound({
        ownActiveImages: quota.ownActiveImages,
        completed: Math.max(quota.roundsCompleted, completedAfterCurrent),
      })
    ) {
      releasePreparedKeepalive(token, payload.roundId);
      enterGate();
      return;
    }
    if (waitingRef.current) showPrepared(payload);
    else rememberNext(payload);
  }

  useEffect(() => {
    if (phase !== 'active') return;
    let cancelled = false;

    async function loadCurrent() {
      try {
        const body = await requestMemeRound(token, 'current');
        if (cancelled) return;
        if (!body.ok || !body.data) {
          setRound(null);
          if (body.code === 'vote_limit') {
            setGated(true);
            setMessage(null);
          } else {
            setGated(false);
            setMessage(body.error ?? memeBattleErrorText(body.code));
          }
          return;
        }
        shownRef.current = body.data.roundId;
        setGated(false);
        setMessage(null);
        setRound(body.data);
      } catch {
        if (cancelled) return;
        setRound(null);
        setMessage('Не удалось открыть тройку. Попробуй ещё раз.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCurrent();
    return () => {
      cancelled = true;
    };
  }, [phase, token, voteQuota.ownActiveImages, voteQuota.maxRounds]);

  useEffect(() => {
    const roundId = round?.roundId;
    if (!roundId || phase !== 'active' || gated) return;
    const activeRoundId = roundId;
    let cancelled = false;

    async function prepareFollowing() {
      let gate = await activateMemeRound(token, activeRoundId);
      let attempts = 0;
      while (!cancelled && gate === 'retry' && shownRef.current === activeRoundId && attempts < 15) {
        attempts += 1;
        await wait(attempts < 8 ? 300 : 1000);
        if (cancelled || shownRef.current !== activeRoundId) return;
        gate = await activateMemeRound(token, activeRoundId);
      }
      if (cancelled || shownRef.current !== activeRoundId) return;
      if (gate === 'limit') {
        if (waitingRef.current) enterGate();
        return;
      }
      if (gate !== 'ok') return;

      for (let attempt = 0; attempt < 2 && !cancelled; attempt += 1) {
        try {
          const body = await requestMemeRound(token, 'prepare');
          if (cancelled || shownRef.current !== activeRoundId) return;
          if (!body.ok || !body.data || body.data.roundId === activeRoundId) {
            if (body.code === 'vote_limit') {
              if (waitingRef.current) enterGate();
              return;
            }
            if (
              waitingRef.current &&
              (body.code === 'not_enough' || body.code === 'no_fresh' || body.code === 'event_closed')
            ) {
              waitingRef.current = false;
              setWaitingNext(false);
              setLockedId(null);
              setMessage(body.error ?? memeBattleErrorText(body.code));
            }
            if (
              attempt === 0 &&
              body.code !== 'not_enough' &&
              body.code !== 'no_fresh' &&
              body.code !== 'vote_limit'
            ) {
              await wait(700);
              continue;
            }
            return;
          }
          const urls = body.data.images.map((image) => image.url);
          const warm = await preloadMemeImages(urls);
          if (!warm) await preloadMemeImages(urls);
          if (cancelled || shownRef.current !== activeRoundId) {
            if (body.data.roundId !== shownRef.current) releasePreparedKeepalive(token, body.data.roundId);
            return;
          }
          publishPrepared(body.data);
          return;
        } catch {
          if (attempt === 0) await wait(700);
        }
      }
    }

    void prepareFollowing();
    return () => {
      cancelled = true;
    };
    // Prefetch must restart only when the shown round changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- publishPrepared reads refs
  }, [phase, round?.roundId, token, gated]);

  useEffect(() => {
    function releaseHiddenPrepared() {
      const hiddenId = nextRef.current;
      if (hiddenId && hiddenId !== shownRef.current) {
        releasePreparedKeepalive(token, hiddenId);
        nextRef.current = null;
      }
      for (const vote of votesRef.current) {
        sendVoteKeepalive(token, vote.roundId, vote.placements);
      }
    }

    window.addEventListener('pagehide', releaseHiddenPrepared);
    return () => {
      window.removeEventListener('pagehide', releaseHiddenPrepared);
      releaseHiddenPrepared();
    };
  }, [token]);

  async function flushVotes() {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      while (votesRef.current.length > 0) {
        const vote = votesRef.current[0];
        if (!vote) break;
        const result = await submitMemeVote(token, vote.roundId, vote.placements);
        if (result.ok || (result.code && VOTE_STOP_CODES.has(result.code))) {
          votesRef.current.shift();
          if (result.ok) void onVotedRef.current();
          continue;
        }
        vote.attempts += 1;
        if (vote.attempts >= 5) break;
        await wait(400 * vote.attempts);
      }
    } finally {
      flushingRef.current = false;
    }
  }

  function assignPlace(imageId: string, place: number) {
    if (!round || lockedId === round.roundId) return;
    setPlaces((current) => {
      const next = { ...current };
      for (const [id, value] of Object.entries(next)) {
        if (value === place) delete next[id];
      }
      if (next[imageId] === place) delete next[imageId];
      else next[imageId] = place;
      return next;
    });
  }

  function dropOn(targetId: string) {
    if (!draggingId || draggingId === targetId || !round || lockedId === round.roundId) return;
    setPlaces((current) => {
      const next = { ...current };
      const from = next[draggingId];
      const to = next[targetId];
      if (from === undefined && to === undefined) return next;
      if (from === undefined) {
        next[draggingId] = to as number;
        delete next[targetId];
        return next;
      }
      if (to === undefined) {
        next[targetId] = from;
        delete next[draggingId];
        return next;
      }
      next[draggingId] = to;
      next[targetId] = from;
      return next;
    });
    setDraggingId(null);
  }

  const ready = round
    ? round.images.every((image) => places[image.id]) && new Set(Object.values(places)).size === 3
    : false;

  function finishRound() {
    if (!round || !ready || lockedId === round.roundId) return;
    const placements = round.images.map((image) => ({
      imageId: image.id,
      place: places[image.id] ?? 0,
    }));
    if (votesRef.current.some((vote) => vote.roundId === round.roundId)) return;
    votesRef.current.push({ roundId: round.roundId, placements, attempts: 0 });
    setLockedId(round.roundId);
    void flushVotes();

    const completedAfter = Math.max(voteQuota.roundsCompleted, roundsCompleted) + 1;
    const mayContinue = canActivatePreparedRound({
      ownActiveImages: voteQuota.ownActiveImages,
      completed: completedAfter,
    });

    if (nextRound && nextRound.roundId !== round.roundId && mayContinue) {
      showPrepared(nextRound);
      return;
    }

    if (nextRound && nextRound.roundId !== round.roundId) {
      releasePreparedKeepalive(token, nextRound.roundId);
      rememberNext(null);
      enterGate();
      return;
    }

    if (!mayContinue) {
      enterGate();
      return;
    }

    waitingRef.current = true;
    setWaitingNext(true);
  }

  const progress = voteRoundProgressLabel({
    ownActiveImages: voteQuota.ownActiveImages,
    roundsCompleted,
    hasCurrentRound: Boolean(round) && !gated,
  });
  const gateCopy = voteLimitCopy(voteQuota.ownActiveImages);

  return (
    <section className="min-w-0 overflow-x-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#9BB6FF]">ТВОЯ ОЧЕРЕДЬ ВЫБИРАТЬ</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Какая смешнее?</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
        Перед тобой 3 картинки. Расставь их от самой смешной к наименее смешной. Имена авторов скрыты.
      </p>
      <p className="mt-3 text-sm text-zinc-400">
        {progress}
        <span className="text-zinc-600"> · </span>
        Ты уже оценил {ratingsGiven} {ruPlural(ratingsGiven, 'картинку', 'картинки', 'картинок')}
      </p>

      {phase !== 'active' ? (
        <p className="mt-6 text-sm leading-relaxed text-zinc-500">
          {phase === 'ended'
            ? 'Оценивать больше нельзя. Результаты остаются ниже.'
            : 'Оценивание откроется, когда событие начнётся.'}
        </p>
      ) : loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-52 animate-pulse rounded-2xl bg-zinc-900 sm:h-72" />
          ))}
        </div>
      ) : gated ? (
        <div className="mt-6 overflow-hidden rounded-3xl border border-[#3166F0]/35 bg-[radial-gradient(ellipse_at_top_left,rgba(49,102,240,0.18),transparent_55%),linear-gradient(160deg,#09090b,#18181b)] p-5 sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#9BB6FF]">ПОПОЛНИ БАНК МЕМОВ</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{gateCopy.title}</h3>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300">{gateCopy.body}</p>
          <p className="mt-4 text-sm text-zinc-400">
            Загружено: {voteQuota.ownActiveImages} / 5
            {!voteQuota.unlimited && voteQuota.maxRounds != null && (
              <>
                <span className="text-zinc-600"> · </span>
                Сыграно {voteQuota.roundsCompleted} из {voteQuota.maxRounds}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={onAddImages}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#3166F0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2858d4] sm:w-auto"
          >
            {gateCopy.cta}
          </button>
        </div>
      ) : round ? (
        <>
          <div className={`mt-6 grid min-w-0 gap-3 sm:grid-cols-3 ${waitingNext ? 'opacity-50' : ''}`}>
            {round.images.map((image) => {
              const place = places[image.id];
              return (
                <article
                  key={image.id}
                  draggable={lockedId !== round.roundId}
                  onDragStart={() => setDraggingId(image.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropOn(image.id)}
                  className={`min-w-0 overflow-hidden rounded-2xl border bg-black transition duration-300 ${
                    place ? 'border-[#3166F0]/70 shadow-[0_12px_40px_rgba(49,102,240,0.12)]' : 'border-zinc-800'
                  }`}
                >
                  <div className="relative">
                    <MemeFitImage src={image.url} alt="Картинка для оценки" frame="vote" />
                    {place && (
                      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
                        {place} место
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-2">
                    {PLACE_LABELS.map((option) => {
                      const selected = place === option.place;
                      return (
                        <button
                          key={option.place}
                          type="button"
                          aria-label={option.title}
                          disabled={lockedId === round.roundId}
                          onClick={() => assignPlace(image.id, option.place)}
                          className={`min-h-11 rounded-xl px-1 py-2 text-sm font-semibold transition ${
                            selected
                              ? 'bg-[#3166F0] text-white'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          {option.medal}
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
          {cheer && <p className="mt-4 text-sm text-[#9BB6FF]">{cheer}</p>}
          {waitingNext ? (
            <p className="mt-5 text-sm font-medium text-[#9BB6FF]">Готовим следующую тройку...</p>
          ) : (
            <button
              type="button"
              disabled={!ready || lockedId === round.roundId}
              onClick={finishRound}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#3166F0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2858d4] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 sm:w-auto"
            >
              Готово →
            </button>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center">
          <p className="text-sm leading-relaxed text-zinc-400">{message}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setMessage(null);
              void requestMemeRound(token, 'current').then((body) => {
                setLoading(false);
                if (!body.ok || !body.data) {
                  if (body.code === 'vote_limit') {
                    setGated(true);
                    return;
                  }
                  setMessage(body.error ?? memeBattleErrorText(body.code));
                  return;
                }
                shownRef.current = body.data.roundId;
                setGated(false);
                setRound(body.data);
              });
            }}
            className="mt-4 min-h-11 text-sm font-medium text-[#9BB6FF]"
          >
            Проверить ещё раз
          </button>
        </div>
      )}

      {message && round && !waitingNext && !gated && <p className="mt-3 text-sm text-zinc-400">{message}</p>}
    </section>
  );
}
