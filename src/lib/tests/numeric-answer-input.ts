/**
 * Mobile keyboard for numeric test answers.
 *
 * `inputMode="numeric"` — digits only, no minus/decimal on many phones.
 * `inputMode="decimal"` — digits + decimal separator, but often no minus (esp. iOS).
 * There is no dedicated signed-decimal mode in HTML; `text` is the reliable way
 * to expose digits, minus, and `.`/`,` while keeping app-side numeric grading.
 */
export const NUMERIC_ANSWER_INPUT_MODE = 'text' as const;

/** Soft hint for browsers that honour pattern with text inputMode. */
export const NUMERIC_ANSWER_INPUT_PATTERN = '-?[0-9]*[.,]?[0-9]*';
