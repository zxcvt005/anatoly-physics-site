'use client';

import { useEffect, useRef, useState } from 'react';
import { MEME_BATTLE_MAX_BYTES } from '@/lib/meme-battle/constants';
import { prepareMemeUpload } from '@/lib/meme-battle/prepare-upload';
import type { MemeEventPhase, MemeImageCard } from '@/lib/meme-battle/types';
import {
  MEME_UPLOAD_CONCURRENCY,
  createLimiter,
  formatByteSize,
  limitSelectionMessage,
  takeWithinSlots,
  uploadBatchHeadline,
  uploadButtonLabel,
  type UploadRowStatus,
} from '@/lib/meme-battle/upload-batch';
import { postMemeImage } from './post-meme-image';
import { MemeFitImage } from './MemeFitImage';

type Draft = {
  id: string;
  name: string;
  previewUrl: string;
  originalBytes: number;
  outputBytes: number | null;
  optimized: boolean;
  status: UploadRowStatus;
  progress: number;
  error: string | null;
  countsTowardLimit: boolean;
  attempted: boolean;
};

function sizeLine(draft: Draft): string {
  if (draft.outputBytes == null) return formatByteSize(draft.originalBytes);
  if (!draft.optimized) return `${formatByteSize(draft.originalBytes)} · без сжатия`;
  return `${formatByteSize(draft.originalBytes)} → ${formatByteSize(draft.outputBytes)}`;
}

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
  const filesRef = useRef(new Map<string, File>());
  const urlsRef = useRef(new Set<string>());
  const cancelledRef = useRef(new Set<string>());
  const limiterRef = useRef(createLimiter(MEME_UPLOAD_CONCURRENCY));
  const claimedRef = useRef(new Set<string>());
  const onChangeRef = useRef(onChange);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const closed = phase !== 'active';

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const pendingSlots = drafts.filter((draft) => draft.countsTowardLimit).length;
  const remaining = Math.max(0, maxImages - images.length - pendingSlots);
  const uploading = drafts.some((draft) => draft.status === 'queued' || draft.status === 'uploading');
  const readyCount = drafts.filter((draft) => draft.status === 'ready').length;
  const attempted = drafts.filter((draft) => draft.attempted);
  const headline =
    attempted.length > 0
      ? uploadBatchHeadline(attempted)
      : uploadBatchHeadline(drafts.filter((draft) => draft.status === 'preparing' || draft.status === 'ready'));

  function patch(id: string, update: (draft: Draft) => Draft) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? update(draft) : draft)));
  }

  function dropDraft(id: string) {
    cancelledRef.current.add(id);
    filesRef.current.delete(id);
    setDrafts((current) => {
      const draft = current.find((item) => item.id === id);
      if (draft) {
        URL.revokeObjectURL(draft.previewUrl);
        urlsRef.current.delete(draft.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  function rememberUrl(url: string) {
    urlsRef.current.add(url);
    return url;
  }

  async function prepareDraft(id: string, file: File) {
    const prepared = await limiterRef.current(() => prepareMemeUpload(file));
    if (cancelledRef.current.has(id)) return;

    if (!prepared.ok) {
      filesRef.current.delete(id);
      patch(id, (draft) => ({
        ...draft,
        status: 'error',
        error: prepared.message,
        countsTowardLimit: false,
      }));
      return;
    }

    filesRef.current.set(id, prepared.file);
    patch(id, (draft) => {
      let previewUrl = draft.previewUrl;
      if (prepared.optimized) {
        URL.revokeObjectURL(draft.previewUrl);
        urlsRef.current.delete(draft.previewUrl);
        previewUrl = rememberUrl(URL.createObjectURL(prepared.file));
      }
      return {
        ...draft,
        previewUrl,
        status: 'ready',
        outputBytes: prepared.outputBytes,
        optimized: prepared.optimized,
        originalBytes: prepared.originalBytes,
        countsTowardLimit: true,
      };
    });
  }

  function selectFiles(list: FileList | File[]) {
    if (closed || uploading) return;
    const incoming = Array.from(list);
    if (incoming.length === 0) return;

    const pending = drafts.filter((draft) => draft.countsTowardLimit).length;
    const slots = Math.max(0, maxImages - images.length - pending);
    const fitting: File[] = [];
    const problems: Draft[] = [];

    for (const file of incoming) {
      const name = file.name || 'Картинка';
      if (file.size <= 0 || file.size > MEME_BATTLE_MAX_BYTES) {
        const previewUrl = rememberUrl(URL.createObjectURL(file));
        problems.push({
          id: crypto.randomUUID(),
          name,
          previewUrl,
          originalBytes: file.size,
          outputBytes: null,
          optimized: false,
          status: 'error',
          progress: 0,
          error:
            file.size <= 0
              ? `Не получилось открыть ${name}.`
              : `${name} больше 5 МБ. Выбери файл поменьше.`,
          countsTowardLimit: false,
          attempted: false,
        });
        continue;
      }
      fitting.push(file);
    }

    const { accepted, overflow } = takeWithinSlots(fitting, slots);
    setNote(overflow > 0 ? limitSelectionMessage(slots) : null);

    const next: Draft[] = accepted.map((file) => {
      const id = crypto.randomUUID();
      filesRef.current.set(id, file);
      return {
        id,
        name: file.name || 'Картинка',
        previewUrl: rememberUrl(URL.createObjectURL(file)),
        originalBytes: file.size,
        outputBytes: null,
        optimized: false,
        status: 'preparing',
        progress: 0,
        error: null,
        countsTowardLimit: true,
        attempted: false,
      };
    });

    if (slots === 0 && fitting.length > 0) {
      setNote('Сейчас больше картинок добавить нельзя.');
    }

    setDrafts((current) => [...current, ...next, ...problems]);
    for (const draft of next) {
      const file = filesRef.current.get(draft.id);
      if (file) void prepareDraft(draft.id, file);
    }
  }

  async function sendDraft(id: string) {
    const file = filesRef.current.get(id);
    if (!file || cancelledRef.current.has(id)) {
      claimedRef.current.delete(id);
      return;
    }

    patch(id, (draft) => ({
      ...draft,
      status: 'uploading',
      progress: 0,
      error: null,
      attempted: true,
      countsTowardLimit: true,
    }));

    const result = await postMemeImage(token, file, (loaded, total) => {
      if (cancelledRef.current.has(id)) return;
      patch(id, (draft) => ({ ...draft, progress: total > 0 ? loaded / total : 0 }));
    });

    if (cancelledRef.current.has(id)) {
      if (result.ok) {
        try {
          await onChangeRef.current();
        } catch {
          // The file is already stored.
        }
      }
      claimedRef.current.delete(id);
      return;
    }

    if (!result.ok) {
      claimedRef.current.delete(id);
      patch(id, (draft) => ({
        ...draft,
        status: 'error',
        error: result.error,
        countsTowardLimit: false,
      }));
      return;
    }

    patch(id, (draft) => ({
      ...draft,
      status: 'done',
      progress: 1,
      error: null,
      countsTowardLimit: true,
    }));

    try {
      await onChangeRef.current();
    } catch {
      // The file is already stored. The gallery refresh can be retried by reopening the tab.
    }

    if (cancelledRef.current.has(id)) return;
    patch(id, (draft) => ({ ...draft, countsTowardLimit: false }));
  }

  function startUpload() {
    if (uploading) return;
    const ids = drafts
      .filter((draft) => draft.status === 'ready' && !claimedRef.current.has(draft.id))
      .map((draft) => draft.id);
    if (ids.length === 0) return;
    for (const id of ids) claimedRef.current.add(id);
    setDrafts((current) =>
      current.map((draft) =>
        ids.includes(draft.id)
          ? { ...draft, status: 'queued', attempted: true, progress: 0, error: null, countsTowardLimit: true }
          : draft,
      ),
    );
    for (const id of ids) {
      void limiterRef.current(() => sendDraft(id));
    }
  }

  function retryDraft(id: string) {
    if (!filesRef.current.has(id) || claimedRef.current.has(id)) return;
    claimedRef.current.add(id);
    patch(id, (draft) => ({
      ...draft,
      status: 'queued',
      attempted: true,
      progress: 0,
      error: null,
      countsTowardLimit: true,
    }));
    void limiterRef.current(() => sendDraft(id));
  }

  async function removeSaved(imageId: string) {
    setRemovingId(imageId);
    setNote(null);
    try {
      const response = await fetch(
        `/api/student/${encodeURIComponent(token)}/meme-battle/images/${encodeURIComponent(imageId)}`,
        { method: 'DELETE' },
      );
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setNote(payload.error ?? 'Не получилось убрать картинку.');
        return;
      }
      await onChangeRef.current();
    } catch {
      setNote('Не получилось убрать картинку.');
    } finally {
      setRemovingId(null);
    }
  }

  const canAdd = !closed && remaining > 0 && !uploading;
  const atCapacity = !closed && remaining <= 0;

  return (
    <section className="min-w-0 overflow-x-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Мои картинки</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {images.length} / {maxImages} загружено
        </p>
      </div>

      {images.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
          Пока пусто. Самый смешной мем ещё в телефоне.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <figure key={image.id} className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
              <MemeFitImage src={image.url} alt="Твоя картинка" frame="gallery" />
              <figcaption className="flex items-center justify-between gap-2 px-3 py-3 text-xs text-zinc-200">
                <span>В игре</span>
                {!closed && (
                  <button
                    type="button"
                    disabled={removingId === image.id || uploading}
                    onClick={() => void removeSaved(image.id)}
                    className="min-h-11 rounded-full bg-white/10 px-3 text-[13px] transition hover:bg-white/20 disabled:opacity-50"
                  >
                    {removingId === image.id ? 'Удаляю…' : 'Удалить'}
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
      ) : (
        <div
          className="relative mt-5 min-w-0"
          onDragOver={(event) => {
            if (!canAdd) return;
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (window.matchMedia('(pointer: fine)').matches) selectFiles(event.dataTransfer.files);
          }}
        >
          {canAdd && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`flex min-h-14 w-full items-center justify-center rounded-2xl px-4 text-base font-semibold text-white transition ${
                dragOver ? 'bg-[#2858d4]' : 'bg-[#3166F0] hover:bg-[#2858d4]'
              }`}
            >
              + Добавить картинки
            </button>
          )}
          {canAdd && (
            <p className="mt-2 hidden text-center text-sm text-zinc-500 md:block">Или перетащи файлы сюда</p>
          )}
          {atCapacity && images.length >= maxImages && (
            <p className="text-sm text-zinc-400">
              Это максимум — {maxImages} из {maxImages}. Можно заменить: удали одну и загрузи другую.
            </p>
          )}
          {atCapacity && images.length < maxImages && (
            <p className="text-sm text-zinc-300">Лимит {maxImages} картинок.</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
            onChange={(event) => {
              selectFiles(event.target.files ?? []);
              event.target.value = '';
            }}
          />
        </div>
      )}

      {(headline || note) && (
        <div className="mt-4 space-y-2">
          {headline && <p className="text-base font-semibold text-white">{headline}</p>}
          {note && <p className="text-sm text-amber-200">{note}</p>}
        </div>
      )}

      {drafts.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
          {drafts.map((draft, index) => (
            <li key={draft.id} className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-black/40">
              <MemeFitImage src={draft.previewUrl} alt="" frame="preview" />
              <div className="min-w-0 space-y-2 px-3 py-3">
                <p className="text-xs font-medium text-zinc-500">Картинка {index + 1}</p>
                <p className="truncate text-sm text-white">{draft.name}</p>
                <p className="text-xs text-zinc-400">{sizeLine(draft)}</p>
                {draft.status === 'preparing' && <p className="text-sm text-[#9BB6FF]">Подготовка...</p>}
                {(draft.status === 'queued' || draft.status === 'uploading') && (
                  <div>
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(draft.progress * 100)}
                    >
                      <div
                        className="h-full rounded-full bg-[#3166F0]"
                        style={{ width: `${Math.round(draft.progress * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-300">
                      {draft.status === 'queued' ? 'Ждёт очереди' : `${Math.round(draft.progress * 100)}%`}
                    </p>
                  </div>
                )}
                {draft.status === 'done' && <p className="text-sm text-emerald-300">Загружено</p>}
                {draft.status === 'error' && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-300">
                      {draft.attempted ? `Не удалось загрузить ${draft.name}` : draft.error}
                    </p>
                    {draft.attempted && draft.error && draft.error !== `Не удалось загрузить ${draft.name}` && (
                      <p className="text-xs text-red-200/80">{draft.error}</p>
                    )}
                    {draft.attempted && (
                      <button
                        type="button"
                        onClick={() => retryDraft(draft.id)}
                        className="min-h-11 rounded-xl border border-zinc-600 px-3 text-sm text-white"
                      >
                        Повторить
                      </button>
                    )}
                  </div>
                )}
                {(draft.status === 'preparing' || draft.status === 'ready' || draft.status === 'error' || draft.status === 'done') && (
                  <button
                    type="button"
                    onClick={() => dropDraft(draft.id)}
                    className="min-h-11 rounded-xl border border-zinc-700 px-3 text-sm text-zinc-200"
                  >
                    Убрать
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {readyCount > 0 && !uploading && (
        <button
          type="button"
          onClick={startUpload}
          className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#3166F0] px-4 text-base font-semibold text-white transition hover:bg-[#2858d4]"
        >
          {uploadButtonLabel(readyCount)}
        </button>
      )}
    </section>
  );
}
