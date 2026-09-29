import { ruPlural } from './time';

export const MEME_UPLOAD_CONCURRENCY = 2;

export type UploadRowStatus = 'preparing' | 'ready' | 'queued' | 'uploading' | 'done' | 'error';

export function takeWithinSlots<T>(items: readonly T[], slots: number): { accepted: T[]; overflow: number } {
  const room = Math.max(0, Math.floor(slots));
  if (room === 0) return { accepted: [], overflow: items.length };
  if (items.length <= room) return { accepted: [...items], overflow: 0 };
  return { accepted: items.slice(0, room), overflow: items.length - room };
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0, Math.round(bytes))} Б`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  const megabytes = bytes / (1024 * 1024);
  const digits = megabytes >= 10 ? 0 : 1;
  return `${megabytes.toFixed(digits)} МБ`;
}

export function uploadButtonLabel(count: number): string {
  return `Загрузить ${count} ${ruPlural(count, 'картинку', 'картинки', 'картинок')}`;
}

export function limitSelectionMessage(slots: number): string {
  const pictures = ruPlural(slots, 'картинку', 'картинки', 'картинок');
  return `Можно добавить только ${slots} ${pictures}. Выбери не больше ${slots}.`;
}

export function uploadBatchHeadline(rows: readonly { status: UploadRowStatus }[]): string | null {
  const preparing = rows.filter((row) => row.status === 'preparing').length;
  const ready = rows.filter((row) => row.status === 'ready').length;
  if (preparing > 0 && preparing + ready === rows.length && rows.length > 0) {
    return `Подготовка ${ready + 1} из ${rows.length}`;
  }

  const batch = rows.filter((row) => row.status === 'queued' || row.status === 'uploading' || row.status === 'done' || row.status === 'error');
  if (batch.length === 0) return null;

  const total = batch.length;
  const success = batch.filter((row) => row.status === 'done').length;
  const open = batch.filter((row) => row.status === 'queued' || row.status === 'uploading').length;

  if (open === 0 && success === total) {
    if (total === 1) return 'Картинка загружена';
    return `Все ${total} ${ruPlural(total, 'картинка', 'картинки', 'картинок')} загружены`;
  }

  if (open === 0 || success > 0) return `Загружено ${success} из ${total}`;

  const started = batch.filter((row) => row.status === 'uploading').length;
  return `Загрузка ${Math.max(1, Math.min(total, started))} из ${total}`;
}

export function createLimiter(limit: number) {
  let active = 0;
  const waiters: Array<() => void> = [];
  const room = Math.max(1, limit);

  return function limitRun<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        active += 1;
        task().then(resolve, reject).finally(() => {
          active -= 1;
          waiters.shift()?.();
        });
      };

      if (active < room) start();
      else waiters.push(start);
    });
  };
}
