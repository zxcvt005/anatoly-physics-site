/* eslint-disable @next/next/no-img-element -- signed storage URLs are not a static Next image host */
'use client';

import { useRef, useState } from 'react';
import { memeBattleErrorText } from '@/lib/meme-battle/messages';
import { MEME_BATTLE_MAX_BYTES } from '@/lib/meme-battle/constants';
import type { MemeEventPhase, MemeImageCard } from '@/lib/meme-battle/types';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function MemeImagePanel({
  token,
  images,
  maxImages,
  phase,
  onChange,
}: {
  token: string;
  images: MemeImageCard[];
  maxImages: number;
  phase: MemeEventPhase;
  onChange: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closed = phase !== 'active';
  const full = images.length >= maxImages;

  function chooseFile(file: File | null) {
    if (!file || closed || full) return;
    if (preview) URL.revokeObjectURL(preview.url);
    if (file.size > MEME_BATTLE_MAX_BYTES) {
      setError(memeBattleErrorText('invalid_file'));
      setPreview(null);
      return;
    }
    if (file.type && !ACCEPT.split(',').includes(file.type)) {
      setError(memeBattleErrorText('invalid_file'));
      setPreview(null);
      return;
    }
    setError(null);
    setPreview({ file, url: URL.createObjectURL(file) });
  }

  async function upload() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set('file', preview.file);
      const response = await fetch(`/api/student/${encodeURIComponent(token)}/meme-battle/images`, {
        method: 'POST',
        body,
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? memeBattleErrorText('invalid_file'));
        return;
      }
      URL.revokeObjectURL(preview.url);
      setPreview(null);
      await onChange();
    } catch {
      setError('Не удалось отправить картинку. Попробуй ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(imageId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/student/${encodeURIComponent(token)}/meme-battle/images/${encodeURIComponent(imageId)}`,
        { method: 'DELETE' },
      );
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'Не получилось убрать картинку.');
        return;
      }
      await onChange();
    } catch {
      setError('Не получилось убрать картинку.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Мои картинки</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {images.length} / {maxImages} загружено
          </p>
        </div>
      </div>

      {images.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
          Пока пусто. Самый смешной мем ещё в телефоне.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <figure
              key={image.id}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-black"
            >
              <img src={image.url} alt="Твоя картинка" className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-3 py-3 text-xs text-zinc-200">
                <span>В игре</span>
                {!closed && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(image.id)}
                    className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] transition hover:bg-white/20 disabled:opacity-50"
                  >
                    Удалить
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {closed ? (
        <p className="mt-5 text-sm text-zinc-500">
          {phase === 'ended'
            ? 'Загрузка закрыта. Картинки, которые уже в игре, остаются в рейтинге.'
            : 'Загрузка откроется вместе с событием.'}
        </p>
      ) : full ? (
        <p className="mt-5 text-sm text-zinc-400">Это максимум — {maxImages} из {maxImages}. Можно заменить: удали одну и загрузи другую.</p>
      ) : (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              chooseFile(event.dataTransfer.files[0] ?? null);
            }}
            className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-sm transition ${
              dragOver
                ? 'border-[#3166F0] bg-[#3166F0]/10 text-white'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            <span className="text-base font-medium text-white">+ Загрузить картинку</span>
            <span className="mt-1">Перетащи файл или выбери его на устройстве</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              chooseFile(event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
          />
        </div>
      )}

      {preview && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/40 p-4">
          <img src={preview.url} alt="Предпросмотр" className="mx-auto max-h-64 rounded-xl object-contain" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void upload()}
              className="rounded-2xl bg-[#3166F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2858d4] disabled:opacity-60"
            >
              {busy ? 'Отправляю…' : 'Отправить в игру'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                URL.revokeObjectURL(preview.url);
                setPreview(null);
              }}
              className="rounded-2xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-500"
            >
              Отменить
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}
