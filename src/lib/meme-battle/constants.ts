export const MEME_BATTLE_SLUG = 'battle-of-pictures';
export const MEME_BATTLE_BUCKET = 'meme-battle';
export const MEME_BATTLE_MAX_BYTES = 5 * 1024 * 1024;

export const MEME_BATTLE_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;

export type MemeBattleMime = keyof typeof MEME_BATTLE_MIME;
