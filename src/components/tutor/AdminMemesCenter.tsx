'use client';

import { useEffect, useState } from 'react';
import { Images, X } from 'lucide-react';
import { MemeFitImage } from '@/components/meme-battle/MemeFitImage';
import { ruPlural } from '@/lib/meme-battle/time';
import type { AdminMemeStudentGroup } from '@/lib/meme-battle/types';

function formatUploadedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAverage(value: number): string {
  return value.toFixed(2);
}

export function AdminMemesCenter() {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<AdminMemeStudentGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/crm/meme-battle', { cache: 'no-store' });
        const body = (await response.json()) as {
          ok: boolean;
          error?: string;
          data?: AdminMemeStudentGroup[];
        };
        if (cancelled) return;
        if (!response.ok || !body.ok || !body.data) {
          setError(body.error ?? 'Не удалось открыть мемы');
          setGroups([]);
          return;
        }
        setError(null);
        setGroups(body.data);
      } catch {
        if (!cancelled) setError('Не удалось открыть мемы');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  async function removeImage(imageId: string) {
    setPendingId(imageId);
    setError(null);
    try {
      const response = await fetch(`/api/crm/meme-battle/images/${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error ?? 'Не получилось убрать картинку');
        return;
      }
      setConfirmId(null);
      setGroups((current) =>
        current.map((group) => ({
          ...group,
          activeCount: group.images.some((image) => image.id === imageId && image.isActive)
            ? Math.max(0, group.activeCount - 1)
            : group.activeCount,
          images: group.images.map((image) =>
            image.id === imageId ? { ...image, isActive: false, url: null } : image,
          ),
        })),
      );
    } catch {
      setError('Не получилось убрать картинку');
    } finally {
      setPendingId(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setLoading(true);
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
      >
        <Images className="h-4 w-4 text-[#6B93FF]" />
        Мемы
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Мемы</h2>
            <p className="text-sm text-zinc-500">Картинки учеников в битве</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-zinc-700 p-2 text-zinc-400 hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto px-4 py-4 sm:px-6">
          {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-zinc-900" />
          ) : groups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
              Пока никто не загрузил картинки.
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.studentId} className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                  <h3 className="text-base font-semibold text-white">{group.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {group.activeCount} / {group.maxImages}{' '}
                    {ruPlural(group.activeCount, 'картинка', 'картинки', 'картинок')}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.images.map((image) => (
                      <article key={image.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                        {image.url ? (
                          <MemeFitImage src={image.url} alt="" frame="admin" />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center bg-zinc-900 text-sm text-zinc-500">
                            Файл убран
                          </div>
                        )}
                        <div className="space-y-1 px-3 py-3 text-sm">
                          <p className="text-zinc-300">{formatUploadedAt(image.createdAt)}</p>
                          <p className="text-zinc-500">
                            {image.participationCount} {ruPlural(image.participationCount, 'показ', 'показа', 'показов')}
                            <span className="text-zinc-700"> · </span>
                            {image.totalVotes} {ruPlural(image.totalVotes, 'голос', 'голоса', 'голосов')}
                            {image.totalVotes > 0 && (
                              <>
                                <span className="text-zinc-700"> · </span>
                                средняя {formatAverage(image.averagePoints)}
                              </>
                            )}
                          </p>
                          <p className={image.isActive ? 'text-emerald-400' : 'text-zinc-500'}>
                            {image.isActive ? 'Активна' : 'Удалена'}
                          </p>
                          {image.isActive && confirmId !== image.id && (
                            <button
                              type="button"
                              disabled={pendingId === image.id}
                              onClick={() => setConfirmId(image.id)}
                              className="mt-2 rounded-xl border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                            >
                              Удалить
                            </button>
                          )}
                          {image.isActive && confirmId === image.id && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={pendingId === image.id}
                                onClick={() => void removeImage(image.id)}
                                className="rounded-xl bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                              >
                                {pendingId === image.id ? 'Убираю…' : 'Удалить точно'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmId(null)}
                                className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
                              >
                                Отмена
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
