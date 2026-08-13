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

export function normalizeSaveTestInput(input: SaveTestInput): SaveTestInput {
  return {
    ...input,
    isPublished: true,
    title: input.title.trim() || 'Домашнее задание',
    questions: input.questions.map((question, index) => ({
      ...question,
      sortOrder: index,
      promptText: question.promptText.trim(),
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
    appId: question.id ?? `q-${index}`,
    testVersion: nextVersion,
    sortOrder: index,
    questionType: question.questionType,
    promptText: question.promptText,
    maxPoints: question.maxPoints,
    config: question.config,
    options: question.options,
  }));

  questions = [...questions, ...inserted];

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
