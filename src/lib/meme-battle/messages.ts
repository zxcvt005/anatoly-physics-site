export const MEME_BATTLE_ERROR_TEXT: Record<string, string> = {
  not_enough: 'Пока здесь недостаточно картинок для нового раунда. Загляни чуть позже.',
  no_fresh: 'На сегодня все — приходи позже',
  event_closed: 'Событие уже завершено. Новые картинки и оценки закрыты.',
  event_scheduled: 'Событие ещё не началось.',
  limit: 'Можно загрузить не больше 5 картинок.',
  invalid_file: 'Нужна обычная картинка JPG, PNG, WEBP или GIF размером до 5 МБ.',
  invalid_image: 'Эта картинка уже снята с конкурса.',
  already_voted: 'Эту картинку ты уже оценивал.',
  retry: 'Не получилось собрать тройку. Попробуй ещё раз.',
  round_void: 'Эта тройка уже устарела. Собираем следующую.',
  round_not_found: 'Этот раунд уже не актуален.',
  already_completed: 'Этот раунд уже отправлен.',
  vote_limit: 'Чтобы продолжить, добавь свои картинки в общий банк.',
  no_event: 'Событие сейчас недоступно.',
};

export function memeBattleErrorText(code: string | undefined): string {
  if (!code) return 'Что-то пошло не так. Попробуй ещё раз.';
  return MEME_BATTLE_ERROR_TEXT[code] ?? 'Что-то пошло не так. Попробуй ещё раз.';
}
