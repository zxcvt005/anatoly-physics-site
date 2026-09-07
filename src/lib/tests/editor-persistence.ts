import type { SaveTestInput, SaveTestQuestionInput } from '@/types/tests';

export interface SimulatedQuestionRow {
  appId: string;
  testVersion: number;
  sortOrder: number;
  questionType: SaveTestQuestionInput['questionType'];
  promptText: string;
  maxPoints: number;
  config: SaveTestQuestionInput['config'];
  options: SaveTestQuestionInput['options'];
}

export interface SimulatedTestRow {
  version: number;
  title: string;
  isPublished: boolean;
}

export function resolveSaveTestVersion(
  currentVersion: number,
  hasAttempts: boolean,
): number {
  return hasAttempts ? currentVersion + 1 : currentVersion;
}

export function shouldReplaceQuestionsInPlace(
  nextVersion: number,
  currentVersion: number,
): boolean {
  return nextVersion === currentVersion;
}

/**
 * test_questions.app_id and test_question_options.app_id are globally unique.
 * Reuse IDs only when replacing the same version in place (after delete).
 * A version bump must insert new app_ids or Postgres rejects the save.
 */
export function resolvePersistedAppId(
  existingId: string | undefined,
  replaceInPlace: boolean,
  generateId: () => string,
): string {
  if (replaceInPlace && existingId) {
    return existingId;
  }

  return generateId();
}

export function collectDuplicateAppIds(appIds: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of appIds) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }

  return [...duplicates];
}

export function normalizeSaveTestInput(input: SaveTestInput): SaveTestInput {
  return {
    ...input,
    isPublished: true,
    title: input.title.trim() || 'Домашнее задание',
    questions: input.questions.map((question, index) => ({
      ...question,
      sortOrder: index,
      promptText: question.promptText.trim() || `Задание ${index + 1}`,
    })),
  };
}

/** In-memory simulation: save → reload cycle for editor persistence tests. */
export function simulateSaveAndReload(input: {
  test: SimulatedTestRow;
  existingQuestions: SimulatedQuestionRow[];
  hasAttempts: boolean;
  payload: SaveTestInput;
}): {
  test: SimulatedTestRow;
  questions: SimulatedQuestionRow[];
} {
  const normalized = normalizeSaveTestInput(input.payload);
  const nextVersion = resolveSaveTestVersion(input.test.version, input.hasAttempts);
  const replaceInPlace = shouldReplaceQuestionsInPlace(nextVersion, input.test.version);

  let questions = [...input.existingQuestions];

  if (replaceInPlace) {
    questions = questions.filter((row) => row.testVersion !== nextVersion);
  }

  const inserted = normalized.questions.map((question, index) => ({
    appId: resolvePersistedAppId(
      question.id,
      replaceInPlace,
      () => `q-v${nextVersion}-${index}`,
    ),
    testVersion: nextVersion,
    sortOrder: index,
    questionType: question.questionType,
    promptText: question.promptText,
    maxPoints: question.maxPoints,
    config: question.config,
    options: question.options.map((option, optionIndex) => ({
      ...option,
      id: resolvePersistedAppId(
        option.id,
        replaceInPlace,
        () => `opt-v${nextVersion}-${index}-${optionIndex}`,
      ),
    })),
  }));

  questions = [...questions, ...inserted];

  const duplicateAppIds = collectDuplicateAppIds(
    questions.map((question) => question.appId),
  );
  if (duplicateAppIds.length > 0) {
    throw new Error(
      `Duplicate test_questions.app_id values: ${duplicateAppIds.join(', ')}`,
    );
  }

  return {
    test: {
      title: normalized.title,
      isPublished: true,
      version: nextVersion,
    },
    questions: questions
      .filter((row) => row.testVersion === nextVersion)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
