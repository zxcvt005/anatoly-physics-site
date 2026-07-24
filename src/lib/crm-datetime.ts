import { logInvalidCrmDate } from '@/lib/crm/log-invalid-crm-date';

/** CRM lesson times are always shown and stored in Moscow time. */
export const CRM_TIMEZONE = 'Europe/Moscow';

export const CRM_DATE_DISPLAY_FALLBACK = '—';

const MOSCOW_OFFSET = '+03:00';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

export function formatCrmMoscowDateKey(raw: string | Date): string {
  const date =
    raw instanceof Date
      ? raw
      : parseCrmDate(typeof raw === 'string' ? raw : String(raw));

  if (!date || !Number.isFinite(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-CA', { timeZone: CRM_TIMEZONE }).format(
    date,
  );
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
