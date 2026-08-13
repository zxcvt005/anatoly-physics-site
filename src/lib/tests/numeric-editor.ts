/** Parse numeric value from CRM editor field (comma or dot decimal separator). */
export function parseEditorNumericValue(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Display stored numeric value without leading zeros. */
export function formatEditorNumericValue(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '';
  return String(value);
}

export function parseEditorToleranceValue(value: string): number {
  const parsed = parseEditorNumericValue(value);
  if (parsed === null) return 0;
  return Math.max(0, parsed);
}

export function validateNumericAnswerDraft(answerText: string): string | null {
  if (parseEditorNumericValue(answerText) === null) {
    return 'Укажите правильный ответ';
  }
  return null;
}

export interface NumericEditorDraft {
  answer: string;
  tolerance: string;
}

export function buildNumericDraftFromConfig(config: {
  correctValue?: number;
  tolerance?: number;
}): NumericEditorDraft {
  return {
    answer: formatEditorNumericValue(config.correctValue),
    tolerance:
      config.tolerance === undefined
        ? '0'
        : formatEditorNumericValue(config.tolerance) || '0',
  };
}

export function numericDraftToConfig(draft: NumericEditorDraft): {
  correctValue: number;
  tolerance: number;
} | null {
  const correctValue = parseEditorNumericValue(draft.answer);
  if (correctValue === null) return null;
  return {
    correctValue,
    tolerance: parseEditorToleranceValue(draft.tolerance),
  };
}
