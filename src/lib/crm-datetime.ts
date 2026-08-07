import { logInvalidCrmDate } from '@/lib/crm/log-invalid-crm-date';

/** CRM lesson times are always shown and stored in Moscow time. */
export const CRM_TIMEZONE = 'Europe/Moscow';

export const CRM_DATE_DISPLAY_FALLBACK = '—';

const MOSCOW_OFFSET = '+03:00';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const SLASH_DATE_ONLY_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})$/;

/** Ensures YYYY-MM-DD regardless of Intl locale separators (e.g. iOS en-CA slashes). */
export function normalizeDateKeyToDashes(dateKey: string): string {
  const trimmed = dateKey.trim();
  const slashMatch = trimmed.match(SLASH_DATE_ONLY_PATTERN);
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
  }

  return trimmed;
}

const POSTGRES_DATETIME_PATTERN =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)(.*)$/;

/**
 * Normalizes CRM date strings for parsing and persistence.
 * Date-only values use noon Moscow, not UTC midnight.
 */
export function normalizeCrmDateInput(
  raw: string | null | undefined,
): string {
  if (raw == null) {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return `${trimmed}T12:00:00${MOSCOW_OFFSET}`;
  }

  const slashDateMatch = trimmed.match(SLASH_DATE_ONLY_PATTERN);
  if (slashDateMatch) {
    return `${slashDateMatch[1]}-${slashDateMatch[2]}-${slashDateMatch[3]}T12:00:00${MOSCOW_OFFSET}`;
  }

  const postgresMatch = trimmed.match(POSTGRES_DATETIME_PATTERN);
  if (postgresMatch) {
    const [, datePart, timePart, tail] = postgresMatch;
    const suffix = tail.trim();

    if (!suffix) {
      return `${datePart}T${timePart}${MOSCOW_OFFSET}`;
    }

    if (suffix === 'Z' || /^[+-]\d{2}:\d{2}$/.test(suffix)) {
      return `${datePart}T${timePart}${suffix}`;
    }

    return `${datePart}T${timePart}${MOSCOW_OFFSET}`;
  }

  return trimmed;
}

export function parseCrmDate(raw: string | null | undefined): Date | null {
  if (raw == null) {
    return null;
  }

  const normalized = normalizeCrmDateInput(raw);
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date;
}

export function getCrmDateMs(raw: string | null | undefined): number | null {
  const date = parseCrmDate(raw);
  return date ? date.getTime() : null;
}

function formatParsedDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!Number.isFinite(date.getTime())) {
    return CRM_DATE_DISPLAY_FALLBACK;
  }

  return new Intl.DateTimeFormat('ru-RU', options).format(date);
}

export function formatCrmDate(
  raw: string | null | undefined,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = {
    day: 'numeric',
    month: 'short',
  },
  timeZone?: string,
): string {
  const date = parseCrmDate(raw);
  if (!date) {
    return CRM_DATE_DISPLAY_FALLBACK;
  }

  return formatParsedDate(date, {
    ...options,
    ...(timeZone ? { timeZone } : {}),
  });
}

export function formatCrmDateTime(
  raw: string | null | undefined,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  },
  timeZone?: string,
): string {
  return formatCrmDate(raw, options, timeZone);
}

function formatMoscowDateKeyFromDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CRM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

export function formatCrmMoscowDateKey(raw: string | Date): string {
  const date =
    raw instanceof Date
      ? raw
      : parseCrmDate(typeof raw === 'string' ? raw : String(raw));

  if (!date || !Number.isFinite(date.getTime())) {
    return '';
  }

  return formatMoscowDateKeyFromDate(date);
}

export function logSkippedInvalidCrmDate(options: {
  component: string;
  field: string;
  itemId?: string;
  rawValue: string;
}): void {
  logInvalidCrmDate({
    ...options,
    parsedTimestamp: Number.NaN,
  });
}
