/* eslint-disable @next/next/no-img-element -- signed storage URLs are not a static Next image host */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { memeBattleErrorText } from '@/lib/meme-battle/messages';
import type { MemeEventPhase, MemeRoundPayload } from '@/lib/meme-battle/types';
import { ruPlural } from '@/lib/meme-battle/time';

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

export function MemeRatePanel({
  token,
  phase,
  ratingsGiven,
  roundsCompleted,
  onVoted,
}: {
  token: string;
  phase: MemeEventPhase;
  ratingsGiven: number;
  roundsCompleted: number;
  onVoted: () => Promise<void>;
}) {
  const [round, setRound] = useState<MemeRoundPayload | null>(null);
  const [places, setPlaces] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cheer, setCheer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(phase === 'active');

  const loadRound = useCallback(async () => {
    try {
      const response = await fetch(`/api/student/${encodeURIComponent(token)}/meme-battle/rounds`, {
        method: 'POST',
      });
      const body = (await response.json()) as {
        ok: boolean;
        code?: string;
        error?: string;
        data?: MemeRoundPayload;
      };
      if (!response.ok || !body.ok || !body.data) {
        setRound(null);
        setPlaces({});
        setMessage(body.error ?? memeBattleErrorText(body.code));
        return;
      }
      setMessage(null);
      setPlaces({});
      setRound(body.data);
    } catch {
      setRound(null);
      setPlaces({});
      setMessage('Не удалось открыть тройку. Попробуй ещё раз.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (phase !== 'active') return;
    let cancelled = false;

    async function loadFromServer() {
      try {
        const response = await fetch(`/api/student/${encodeURIComponent(token)}/meme-battle/rounds`, {
          method: 'POST',
        });
        const body = (await response.json()) as {
          ok: boolean;
          code?: string;
          error?: string;
          data?: MemeRoundPayload;
        };
        if (cancelled) return;
        if (!response.ok || !body.ok || !body.data) {
          setRound(null);
          setPlaces({});
          setMessage(body.error ?? memeBattleErrorText(body.code));
          return;
        }
        setMessage(null);
        setPlaces({});
        setRound(body.data);
      } catch {
        if (cancelled) return;
        setRound(null);
        setPlaces({});
        setMessage('Не удалось открыть тройку. Попробуй ещё раз.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFromServer();
    return () => {
      cancelled = true;
    };
  }, [phase, token]);

  function assignPlace(imageId: string, place: number) {
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
    if (!draggingId || draggingId === targetId) return;
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

  const ready = round?.images.every((image) => places[image.id]) && new Set(Object.values(places)).size === 3;

  async function submit() {
    if (!round || !ready) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/student/${encodeURIComponent(token)}/meme-battle/rounds/${encodeURIComponent(round.roundId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placements: round.images.map((image) => ({
              imageId: image.id,
              place: places[image.id],
            })),
          }),
        },
      );
      const body = (await response.json()) as { ok: boolean; code?: string; error?: string };
      if (!response.ok || !body.ok) {
        setMessage(body.error ?? memeBattleErrorText(body.code));
        if (body.code === 'round_void' || body.code === 'already_completed' || body.code === 'invalid_image') {
          void loadRound();
        }
        return;
      }
      setCheer(CHEERS[roundsCompleted % CHEERS.length] ?? CHEERS[0]);
      await onVoted();
      window.setTimeout(() => {
        setCheer(null);
        void loadRound();
      }, 700);
    } catch {
      setMessage('Оценка не сохранилась. Попробуй ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#9BB6FF]">ТВОЯ ОЧЕРЕДЬ ВЫБИРАТЬ</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Какая смешнее?</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
        Перед тобой 3 картинки. Расставь их от самой смешной к наименее смешной. Имена авторов скрыты.
      </p>
      <p className="mt-3 text-sm text-zinc-400">
        Раунд {roundsCompleted + (phase === 'active' && round ? 1 : 0)}
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
            <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-zinc-900" />
          ))}
        </div>
      ) : round ? (
        <>
          <div className={`mt-6 grid gap-3 sm:grid-cols-3 ${cheer ? 'opacity-60' : ''}`}>
            {round.images.map((image) => {
              const place = places[image.id];
              return (
                <article
                  key={image.id}
                  draggable
                  onDragStart={() => setDraggingId(image.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropOn(image.id)}
                  className={`overflow-hidden rounded-2xl border bg-black transition duration-300 ${
                    place ? 'border-[#3166F0]/70 shadow-[0_12px_40px_rgba(49,102,240,0.12)]' : 'border-zinc-800'
                  }`}
                >
                  <div className="relative">
                    <img src={image.url} alt="Картинка для оценки" className="aspect-[4/5] w-full object-cover" />
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
                          disabled={busy}
                          onClick={() => assignPlace(image.id, option.place)}
                          className={`rounded-xl px-1 py-2 text-xs font-semibold transition ${
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
          <button
            type="button"
            disabled={!ready || busy || Boolean(cheer)}
            onClick={() => void submit()}
            className="mt-5 inline-flex rounded-2xl bg-[#3166F0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2858d4] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {busy ? 'Сохраняю…' : 'Готово →'}
          </button>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center">
          <p className="text-sm leading-relaxed text-zinc-400">{message}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadRound();
            }}
            className="mt-4 text-sm font-medium text-[#9BB6FF]"
          >
            Проверить ещё раз
          </button>
        </div>
      )}

      {message && round && <p className="mt-3 text-sm text-red-300">{message}</p>}
    </section>
  );
}
