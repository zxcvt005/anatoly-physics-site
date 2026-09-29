import {
  MEME_BATTLE_MAX_BYTES,
  MEME_BATTLE_MIME,
  type MemeBattleMime,
} from './constants';

export function detectImageMime(bytes: Uint8Array): MemeBattleMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function validateMemeImageBytes(
  bytes: Uint8Array,
): { ok: true; mime: MemeBattleMime; extension: string } | { ok: false; code: 'invalid_file' } {
  if (bytes.byteLength === 0 || bytes.byteLength > MEME_BATTLE_MAX_BYTES) {
    return { ok: false, code: 'invalid_file' };
  }
  const mime = detectImageMime(bytes);
  if (!mime) return { ok: false, code: 'invalid_file' };
  return { ok: true, mime, extension: MEME_BATTLE_MIME[mime] };
}
