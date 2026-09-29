import { MEME_BATTLE_MAX_BYTES, type MemeBattleMime } from './constants';
import { detectImageMime } from './images';

export const MEME_PREPARE_MAX_EDGE = 1920;
export const MEME_PREPARE_KEEP_ORIGINAL_BYTES = 380 * 1024;
export const MEME_PREPARE_TARGET_BYTES = 1024 * 1024;

export const MEME_REENCODE_STEPS = [
  { maxEdge: 1920, quality: 0.84 },
  { maxEdge: 1920, quality: 0.78 },
  { maxEdge: 1600, quality: 0.8 },
] as const;

export type MemePreparePlan = 'reject-size' | 'keep-gif' | 'keep-small' | 'reencode';

export function fittedSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const longest = Math.max(safeWidth, safeHeight);
  if (longest <= maxEdge) return { width: safeWidth, height: safeHeight };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

export function planMemeUpload(input: {
  bytes: number;
  maxEdge: number | null;
  mime: MemeBattleMime | null;
}): MemePreparePlan {
  if (!Number.isFinite(input.bytes) || input.bytes <= 0 || input.bytes > MEME_BATTLE_MAX_BYTES) {
    return 'reject-size';
  }
  if (input.mime === 'image/gif') return 'keep-gif';
  const edge = input.maxEdge ?? Number.POSITIVE_INFINITY;
  if (
    input.mime &&
    edge <= MEME_PREPARE_MAX_EDGE &&
    input.bytes <= MEME_PREPARE_KEEP_ORIGINAL_BYTES
  ) {
    return 'keep-small';
  }
  return 'reencode';
}

export type PreparedMemeUpload = {
  ok: true;
  file: File;
  originalBytes: number;
  outputBytes: number;
  optimized: boolean;
};

export type RejectedMemeUpload = {
  ok: false;
  message: string;
};

type Drawable = {
  width: number;
  height: number;
  source: CanvasImageSource;
  close?: () => void;
};

function outputName(original: string, mime: string): string {
  const base = original.replace(/\.[^.]+$/, '').trim() || 'image';
  const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
  return `${base}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    image.src = url;
  });
}

async function decodeOriented(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      };
    } catch {
      // Older browsers decode through Image, which also applies EXIF orientation.
    }
  }

  const image = await loadImageElement(file);
  return { width: image.naturalWidth, height: image.naturalHeight, source: image };
}

function drawFitted(source: CanvasImageSource, width: number, height: number, maxEdge: number): HTMLCanvasElement {
  const size = fittedSize(width, height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');
  context.drawImage(source, 0, 0, size.width, size.height);
  return canvas;
}

async function encodeDrawable(drawable: Drawable): Promise<File | null> {
  let best: { blob: Blob; type: string } | null = null;

  for (const step of MEME_REENCODE_STEPS) {
    const canvas = drawFitted(drawable.source, drawable.width, drawable.height, step.maxEdge);
    const webp = await canvasToBlob(canvas, 'image/webp', step.quality);
    const blob = webp ?? (await canvasToBlob(canvas, 'image/jpeg', Math.min(0.9, step.quality + 0.04)));
    canvas.width = 0;
    canvas.height = 0;
    if (!blob || blob.size <= 0) continue;

    const type = webp ? 'image/webp' : 'image/jpeg';
    if (!best || blob.size < best.blob.size) best = { blob, type };
    if (blob.size <= MEME_PREPARE_TARGET_BYTES) break;
  }

  if (!best) return null;
  return new File([best.blob], 'image', { type: best.type });
}

export async function prepareMemeUpload(file: File): Promise<PreparedMemeUpload | RejectedMemeUpload> {
  if (file.size <= 0 || file.size > MEME_BATTLE_MAX_BYTES) {
    return { ok: false, message: `${file.name} больше 5 МБ. Выбери файл поменьше.` };
  }
  if (file.type === 'image/svg+xml') {
    return { ok: false, message: `Не получилось открыть ${file.name}. Выбери JPG, PNG или WEBP.` };
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sniffed = detectImageMime(head);

  if (sniffed === 'image/gif') {
    return {
      ok: true,
      file,
      originalBytes: file.size,
      outputBytes: file.size,
      optimized: false,
    };
  }

  let drawable: Drawable;
  try {
    drawable = await decodeOriented(file);
  } catch {
    return { ok: false, message: `Не получилось открыть ${file.name}. Выбери JPG, PNG или WEBP.` };
  }

  try {
    if (drawable.width < 1 || drawable.height < 1) {
      return { ok: false, message: `Не получилось открыть ${file.name}. Выбери JPG, PNG или WEBP.` };
    }

    const plan = planMemeUpload({
      bytes: file.size,
      maxEdge: Math.max(drawable.width, drawable.height),
      mime: sniffed,
    });

    if (plan === 'keep-small' && sniffed) {
      return {
        ok: true,
        file,
        originalBytes: file.size,
        outputBytes: file.size,
        optimized: false,
      };
    }

    const encoded = await encodeDrawable(drawable);
    if (!encoded) {
      if (sniffed) {
        return {
          ok: true,
          file,
          originalBytes: file.size,
          outputBytes: file.size,
          optimized: false,
        };
      }
      return { ok: false, message: `Не получилось открыть ${file.name}. Выбери JPG, PNG или WEBP.` };
    }

    const longest = Math.max(drawable.width, drawable.height);
    const keepOriginal =
      sniffed !== null &&
      longest <= MEME_PREPARE_MAX_EDGE &&
      encoded.size >= file.size * 0.9;

    if (keepOriginal) {
      return {
        ok: true,
        file,
        originalBytes: file.size,
        outputBytes: file.size,
        optimized: false,
      };
    }

    const optimized = new File([encoded], outputName(file.name, encoded.type), {
      type: encoded.type || 'image/webp',
    });

    return {
      ok: true,
      file: optimized,
      originalBytes: file.size,
      outputBytes: optimized.size,
      optimized: true,
    };
  } finally {
    drawable.close?.();
  }
}
