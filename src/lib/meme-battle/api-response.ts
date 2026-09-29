import { NextResponse } from 'next/server';
import { memeBattleErrorText } from './messages';

const STATUS_BY_CODE: Record<string, number> = {
  not_enough: 200,
  no_fresh: 200,
  event_scheduled: 200,
  round_void: 409,
  event_closed: 409,
  limit: 409,
  already_voted: 409,
  already_completed: 409,
  invalid_file: 400,
  invalid_places: 400,
  invalid_image: 400,
  invalid_triple: 400,
  not_found: 404,
  round_not_found: 404,
  no_event: 404,
};

export function memeBattleFailure(code: string, error?: string) {
  return NextResponse.json(
    {
      ok: false as const,
      code,
      error: memeBattleErrorText(code) || error || 'Что-то пошло не так. Попробуй ещё раз.',
    },
    { status: STATUS_BY_CODE[code] ?? 500 },
  );
}
