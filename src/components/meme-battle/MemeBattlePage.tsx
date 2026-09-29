'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatRemaining, memeEventPhase } from '@/lib/meme-battle/time';
import type { MemeBattleOverview } from '@/lib/meme-battle/types';
import { MemeImagePanel } from './MemeImagePanel';
import { MemeRatePanel } from './MemeRatePanel';
import { MemeTopFive } from './MemeTopFive';
import { useNow } from './useServerClock';

type BattleTab = 'play' | 'mine' | 'top';

const TABS: { id: BattleTab; label: string }[] = [
  { id: 'play', label: 'Играть' },
  { id: 'mine', label: 'Мои картинки' },
  { id: 'top', label: 'ТОП-5' },
];

export function MemeBattlePage({ token }: { token: string }) {
  const [overview, setOverview] = useState<MemeBattleOverview | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<BattleTab>('play');
  const now = useNow();

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/student/${encodeURIComponent(token)}/meme-battle`, {
        cache: 'no-store',
      });
      const body = (await response.json()) as {
        ok: boolean;
        error?: string;
        data?: MemeBattleOverview | null;
      };
      if (!response.ok || !body.ok) {
        setError(body.error ?? 'Не удалось открыть событие');
        setOverview(null);
        return;
      }
      setError(null);
      setMissing(!body.data);
      setOverview(body.data ?? null);
    } catch {
      setError('Не удалось открыть событие');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadFromServer() {
      try {
        const response = await fetch(`/api/student/${encodeURIComponent(token)}/meme-battle`, {
          cache: 'no-store',
        });
        const body = (await response.json()) as {
          ok: boolean;
          error?: string;
          data?: MemeBattleOverview | null;
        };
        if (cancelled) return;
        if (!response.ok || !body.ok) {
          setError(body.error ?? 'Не удалось открыть событие');
          setOverview(null);
          return;
        }
        setError(null);
        setMissing(!body.data);
        setOverview(body.data ?? null);
      } catch {
        if (!cancelled) setError('Не удалось открыть событие');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFromServer();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-950" />;
  }

  if (error) {
    return (
      <p className="rounded-3xl border border-red-900/50 bg-red-950/20 px-5 py-8 text-center text-red-300">
        {error}
      </p>
    );
  }

  if (missing || !overview) {
    return (
      <p className="rounded-3xl border border-dashed border-zinc-800 px-5 py-8 text-center text-sm text-zinc-500">
        Событие сейчас недоступно. Кабинет работает как обычно.
      </p>
    );
  }

  const phase = memeEventPhase(overview.event.startsAt, overview.event.endsAt, now);
  const countdown =
    phase === 'ended'
      ? 'Событие завершено'
      : phase === 'scheduled'
        ? formatRemaining(overview.event.startsAt, now).replace('Осталось', 'Старт через')
        : formatRemaining(overview.event.endsAt, now);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">{overview.event.description}</p>
        <p className="text-sm font-medium text-[#9BB6FF]">{countdown}</p>
      </div>

      <div className="inline-flex w-full rounded-xl border border-zinc-800 bg-zinc-950 p-1 sm:w-auto">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
              tab === item.id
                ? 'bg-[#3166F0] text-white shadow-[0_0_20px_rgba(49,102,240,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'play' && (
        <MemeRatePanel
          token={token}
          phase={phase}
          ratingsGiven={overview.ratingsGiven}
          roundsCompleted={overview.roundsCompleted}
          voteQuota={overview.voteQuota}
          onVoted={load}
          onAddImages={() => setTab('mine')}
        />
      )}

      {tab === 'mine' && (
        <MemeImagePanel
          token={token}
          images={overview.myImages}
          maxImages={overview.event.maxImages}
          phase={phase}
          onChange={load}
        />
      )}

      {tab === 'top' && (
        <MemeTopFive
          entries={overview.ranking}
          activeImageCount={overview.activeImageCount}
          phase={phase}
        />
      )}

      <Link href={`/student/${encodeURIComponent(token)}`} className="text-sm text-zinc-500 transition hover:text-white">
        ← Вернуться в кабинет
      </Link>
    </div>
  );
}
