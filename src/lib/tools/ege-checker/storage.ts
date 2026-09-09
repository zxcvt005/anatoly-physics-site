import {
  EGE_CHECKER_STORAGE_KEY,
  EGE_CHECKER_STORAGE_VERSION,
  QUESTION_RULES,
  createEmptyAnswerMap,
} from '@/lib/tools/ege-checker/constants';
import type { AnswerMap, StoredReferenceAnswers } from '@/lib/tools/ege-checker/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeAnswers(value: unknown): AnswerMap {
  const answers = createEmptyAnswerMap();

  if (!isRecord(value)) {
    return answers;
  }

  for (const rule of QUESTION_RULES) {
    const key = String(rule.number);
    const raw = value[key];
    answers[key] = typeof raw === 'string' ? raw : '';
  }

  return answers;
}

export function parseStoredReferences(raw: string | null): AnswerMap {
  if (!raw) {
    return createEmptyAnswerMap();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return createEmptyAnswerMap();
    }

    if (parsed.version !== EGE_CHECKER_STORAGE_VERSION) {
      return createEmptyAnswerMap();
    }

    return sanitizeAnswers(parsed.answers);
  } catch {
    return createEmptyAnswerMap();
  }
}

export function serializeReferences(answers: AnswerMap): string {
  const payload: StoredReferenceAnswers = {
    version: EGE_CHECKER_STORAGE_VERSION,
    answers: sanitizeAnswers(answers),
  };

  return JSON.stringify(payload);
}

export function readStoredReferences(): AnswerMap {
  if (typeof window === 'undefined') {
    return createEmptyAnswerMap();
  }

  try {
    return parseStoredReferences(
      window.localStorage.getItem(EGE_CHECKER_STORAGE_KEY),
    );
  } catch {
    return createEmptyAnswerMap();
  }
}

export function writeStoredReferences(answers: AnswerMap): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      EGE_CHECKER_STORAGE_KEY,
      serializeReferences(answers),
    );
  } catch {
    // Ignore quota and privacy-mode errors.
  }
}
