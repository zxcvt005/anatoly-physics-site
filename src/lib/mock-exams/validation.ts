import type { MockExamInput, MockExamUpdateInput } from '@/lib/mock-exams/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function generateMockExamId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateMockExamResultId(): string {
  return `mock-res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resultKey(studentId: string, mockExamId: string): string {
  return `${studentId}:${mockExamId}`;
}

export function parseResultKey(key: string): {
  studentId: string;
  mockExamId: string;
} {
  const separatorIndex = key.indexOf(':');
  if (separatorIndex === -1) {
    return { studentId: key, mockExamId: '' };
  }
  return {
    studentId: key.slice(0, separatorIndex),
    mockExamId: key.slice(separatorIndex + 1),
  };
}

export function isValidExamDate(value: string): boolean {
  if (!DATE_RE.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

export function parseIntegerScore(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}

/**
 * Validates a score against maxScore.
 * Returns { ok: true, score } for a valid integer in range,
 * { ok: true, clear: true } for empty input (no result),
 * or { ok: false, error }.
 */
export function validateScoreInput(
  raw: string,
  maxScore: number,
):
  | { ok: true; score: number; clear?: undefined }
  | { ok: true; clear: true; score?: undefined }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: true, clear: true };
  }

  const score = parseIntegerScore(trimmed);
  if (score === null) {
    return { ok: false, error: 'Score must be an integer' };
  }

  if (!Number.isInteger(maxScore) || maxScore <= 0) {
    return { ok: false, error: 'Invalid max score' };
  }

  if (score < 0) {
    return { ok: false, error: 'Score cannot be negative' };
  }

  if (score > maxScore) {
    return { ok: false, error: `Score cannot exceed ${maxScore}` };
  }

  return { ok: true, score };
}

export function validateMockExamInput(
  input: MockExamInput,
): { ok: true; value: MockExamInput } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: 'Title is required' };
  }

  if (!isValidExamDate(input.examDate)) {
    return { ok: false, error: 'Valid exam date is required' };
  }

  if (!Number.isInteger(input.maxScore) || input.maxScore <= 0) {
    return { ok: false, error: 'maxScore must be a positive integer' };
  }

  return {
    ok: true,
    value: {
      title,
      examDate: input.examDate,
      maxScore: input.maxScore,
    },
  };
}

export function validateMockExamUpdate(
  input: MockExamUpdateInput,
  options?: { highestExistingScore?: number | null },
): { ok: true; value: MockExamUpdateInput } | { ok: false; error: string } {
  const next: MockExamUpdateInput = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      return { ok: false, error: 'Title is required' };
    }
    next.title = title;
  }

  if (input.examDate !== undefined) {
    if (!isValidExamDate(input.examDate)) {
      return { ok: false, error: 'Valid exam date is required' };
    }
    next.examDate = input.examDate;
  }

  if (input.maxScore !== undefined) {
    if (!Number.isInteger(input.maxScore) || input.maxScore <= 0) {
      return { ok: false, error: 'maxScore must be a positive integer' };
    }
    const highest = options?.highestExistingScore ?? null;
    if (highest !== null && input.maxScore < highest) {
      return {
        ok: false,
        error: `maxScore cannot be lower than existing score ${highest}`,
      };
    }
    next.maxScore = input.maxScore;
  }

  if (
    next.title === undefined &&
    next.examDate === undefined &&
    next.maxScore === undefined
  ) {
    return { ok: false, error: 'No fields to update' };
  }

  return { ok: true, value: next };
}

/**
 * Enter moves focus down within the same exam column.
 */
export function resolveEnterCellNavigation(
  rowIndex: number,
  rowCount: number,
): { nextRowIndex: number; stay: boolean } {
  if (rowCount <= 0) {
    return { nextRowIndex: 0, stay: true };
  }

  if (rowIndex >= rowCount - 1) {
    return { nextRowIndex: rowCount - 1, stay: true };
  }

  return { nextRowIndex: rowIndex + 1, stay: false };
}
