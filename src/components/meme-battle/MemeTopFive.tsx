/* eslint-disable @next/next/no-img-element -- signed storage URLs are not a static Next image host */
'use client';

import { MEME_TOP_FIVE_LIMIT, memeTopFiveState } from '@/lib/meme-battle/ranking';
import { ruPlural } from '@/lib/meme-battle/time';
import type { MemeEventPhase, MemeRankingEntry } from '@/lib/meme-battle/types';

const MEDALS = ['🥇', '🥈', '🥉'];

function formatAverage(value: number): string {
  return value.toFixed(2);
}

function PlaceCard({
  entry,
  place,
  phase,
  featured,
}: {
  entry: MemeRankingEntry;
  place: number;
  phase: MemeEventPhase;
  featured?: boolean;
}) {
  const medal = MEDALS[place - 1];

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-black/40 ${
        featured ? 'border-[#3166F0]/40 shadow-[0_18px_50px_rgba(49,102,240,0.12)]' : 'border-zinc-800'
      }`}
    >
      <div className="relative">
        <img
          src={entry.url}
          alt=""
          className={`w-full object-cover ${featured ? 'aspect-[4/3] sm:aspect-[16/10]' : 'aspect-[4/5]'}`}
        />
        <p className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
          {medal ? `${medal} ` : ''}
          {place} место
        </p>
      </div>
      <div className="space-y-1 px-4 py-3">
        <p className={`${featured ? 'text-base' : 'text-sm'} font-medium text-white`}>
          Средняя оценка {formatAverage(entry.averagePoints)}
        </p>
        <p className="text-sm text-zinc-500">
          {entry.totalVotes} {ruPlural(entry.totalVotes, 'голос', 'голоса', 'голосов')}
        </p>
        {phase === 'ended' && entry.authorFirstName && (
          <p className="text-sm text-zinc-300">Автор: {entry.authorFirstName}</p>
        )}
      </div>
    </article>
  );
}

export function MemeTopFive({
  entries,
  activeImageCount,
  phase,
}: {
  entries: MemeRankingEntry[];
  activeImageCount: number;
  phase: MemeEventPhase;
}) {
  const state = memeTopFiveState(activeImageCount, entries.length);
  const top = entries.slice(0, MEME_TOP_FIVE_LIMIT);
  const winner = top[0];
  const rest = top.slice(1);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#9BB6FF]">ВИТРИНА</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Топ-5</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
        Пять самых смешных картинок по средней оценке. Смотреть можно даже без своих загрузок.
        {phase === 'ended' ? ' Конкурс завершён, авторов уже можно показать.' : ' Пока событие идёт, авторы скрыты.'}
      </p>

      {state === 'too_few_images' && (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-400">
          Пока здесь слишком мало картинок для ТОП-5
        </p>
      )}

      {state === 'too_early' && (
        <p className="mt-6 rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-400">
          Пока рано выбирать победителей
        </p>
      )}

      {state === 'ready' && winner && (
        <div className="mt-6 space-y-3">
          <PlaceCard entry={winner} place={1} phase={phase} featured />
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {rest.map((entry, index) => (
                <PlaceCard key={entry.id} entry={entry} place={index + 2} phase={phase} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
