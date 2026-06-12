import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfiguredOnServer } from '@/lib/supabase/env.server';

const LOG_PREFIX = '[supabase:students-check]';

export type StudentsConnectionCheckResult =
  | {
      ok: true;
      rowCount: number;
      rows: Record<string, unknown>[];
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Безопасная проверка чтения из public.students.
 * Не бросает исключения — возвращает результат или текст ошибки.
 */
export async function checkStudentsTableConnection(
  limit = 5,
): Promise<StudentsConnectionCheckResult> {
  if (!isSupabaseConfiguredOnServer()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .limit(limit);

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      rowCount: data?.length ?? 0,
      rows: (data ?? []) as Record<string, unknown>[],
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Пишет результат проверки в консоль сервера (stdout / stderr). */
export async function logStudentsConnectionCheck(
  limit = 5,
): Promise<StudentsConnectionCheckResult> {
  const result = await checkStudentsTableConnection(limit);

  if (result.ok) {
    console.log(`${LOG_PREFIX} OK — received ${result.rowCount} row(s)`);
    console.log(`${LOG_PREFIX} data:`, JSON.stringify(result.rows, null, 2));
    return result;
  }

  console.error(`${LOG_PREFIX} FAILED —`, result.error);
  return result;
}
