/* eslint-disable @next/next/no-img-element -- signed storage URLs are not a static Next image host */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatCountdownBadge, formatRemaining, memeEventPhase, ruPlural } from '@/lib/meme-battle/time';
import type { MemeBattleOverview } from '@/lib/meme-battle/types';
import { useNow } from './useServerClock';

const TILTS = ['-rotate-6', 'rotate-3', 'rotate-6', '-rotate-2'] as const;
const OFFSETS = ['left-0 top-4', 'left-14 top-0', 'left-28 top-6', 'left-[9.5rem] top-1'] as const;

function Collage({ images }: { images: { id: string; url: string }[] }) {
  const frames = Array.from({ length: 4 }, (_, index) => images[index] ?? null);

  return (
    <div className="relative mx-auto h-40 w-full max-w-[280px] shrink-0 sm:h-44 sm:w-[280px]">
      {frames.map((image, index) => (
        <div
          key={image?.id ?? `frame-${index}`}
          className={`absolute h-28 w-24 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.55)] ${TILTS[index]} ${OFFSETS[index]}`}
        >
          {image ? (
            <img src={image.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(49,102,240,0.28),transparent_55%),linear-gradient(160deg,#18181b,#09090b)]" />
          )}
        </div>
      ))}
    </div>
  );
}

export function MemeBattleBanner({ token }: { token: string }) {
  const [overview, setOverview] = useState<MemeBattleOverview | null>(null);
  const [visible, setVisible] = useState(false);
  const now = useNow();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/student/${encodeURIComponent(token)}/meme-battle`, {
          cache: 'no-store',
        });
        const body = (await response.json()) as {
          ok: boolean;
          data?: MemeBattleOverview | null;
        };
        if (cancelled) return;
        if (!response.ok || !body.ok || !body.data) {
          setOverview(null);
          setVisible(false);
          return;
        }
        setOverview(body.data);
        setVisible(true);
      } catch {
        if (!cancelled) {
          setOverview(null);
          setVisible(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!visible || !overview) return null;

  const { event, myImages, ratingsGiven, collage } = overview;
  const phase = memeEventPhase(event.startsAt, event.endsAt, now);
  const remaining =
    phase === 'scheduled'
      ? formatRemaining(event.startsAt, now).replace('Осталось', 'Старт через')
      : phase === 'ended'
        ? 'Завершено'
        : formatRemaining(event.endsAt, now);
  const badge =
    phase === 'ended'
      ? 'Завершено'
      : phase === 'scheduled'
        ? 'Скоро'
        : `Осталось ${formatCountdownBadge(formatRemaining(event.endsAt, now))}`;
  const joined = myImages.length > 0 || ratingsGiven > 0;
  const href = `/student/${encodeURIComponent(token)}/meme-battle`;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 transition duration-300 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(49,102,240,0.16),transparent_58%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="inline-flex rounded-full border border-[#3166F0]/30 bg-[#3166F0]/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#9BB6FF]">
            {badge}
          </p>
          <h2 className="mt-4 text-[1.65rem] font-semibold uppercase leading-none tracking-[0.14em] text-white sm:text-3xl">
            Битва картинок
          </h2>
          <p className="mt-3 text-base text-zinc-100 sm:text-lg">
            {joined ? 'Твои картинки уже в игре' : event.tagline}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
            {joined
              ? `${myImages.length}/${event.maxImages} загружено · ${ratingsGiven} ${ruPlural(ratingsGiven, 'оценка', 'оценки', 'оценок')}`
              : `Загрузи до ${event.maxImages} своих мемов и оцени картинки других студентов.`}
          </p>
          <p className="mt-3 text-sm text-[#9BB6FF]">{remaining}</p>
          <span className="mt-5 inline-flex items-center rounded-2xl bg-[#3166F0] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_32px_rgba(49,102,240,0.28)] transition group-hover:bg-[#2858d4]">
            {phase === 'ended' ? 'Смотреть рейтинг →' : joined ? 'Продолжить →' : 'Участвовать →'}
          </span>
        </div>
        <Collage images={collage} />
      </div>
    </Link>
  );
}
