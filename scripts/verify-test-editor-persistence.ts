import assert from 'node:assert/strict';
import {
  normalizeSaveTestInput,
  resolveSaveTestVersion,
  shouldReplaceQuestionsInPlace,
  simulateSaveAndReload,
} from '../src/lib/tests/editor-persistence';
import type { SaveTestInput } from '../src/types/tests';

function buildPayload(questionCount: number): SaveTestInput {
  return {
    title: 'Кинематика',
    isPublished: false,
    questions: Array.from({ length: questionCount }, (_, index) => ({
      id: `q-${index + 1}`,
      sortOrder: index,
      questionType: 'numeric' as const,
      promptText: `Условие ${index + 1}`,
      maxPoints: 1,
      config: { correctValue: index + 1, tolerance: 0.1 },
      options: [],
    })),
  };
}

function testNormalizeAlwaysPublishes() {
  const normalized = normalizeSaveTestInput({
    title: '  Тест  ',
    isPublished: false,
    questions: [],
  });

  assert.equal(normalized.isPublished, true);
  assert.equal(normalized.title, 'Тест');
}

function testFirstSaveAndReloadKeepsThreeQuestions() {
  const payload = buildPayload(3);
  const first = simulateSaveAndReload({
    test: { version: 1, title: 'Draft', isPublished: false },
    existingQuestions: [],
    hasAttempts: false,
    payload,
  });

  assert.equal(first.test.version, 1);
  assert.equal(first.test.isPublished, true);
  assert.equal(first.questions.length, 3);
  assert.equal(first.questions[0]?.questionType, 'numeric');
  assert.equal(
    (first.questions[0]?.config as { correctValue?: number }).correctValue,
    1,
  );
  assert.equal(first.questions[2]?.promptText, 'Условие 3');

  const reload = simulateSaveAndReload({
    test: first.test,
    existingQuestions: first.questions.map((question) => ({
      appId: question.appId,
      testVersion: question.testVersion,
      sortOrder: question.sortOrder,
      questionType: question.questionType,
      promptText: question.promptText,
      maxPoints: question.maxPoints,
      config: question.config,
      options: question.options,
    })),
    hasAttempts: false,
    payload: buildPayload(3),
  });

  assert.equal(reload.questions.length, 3);
  assert.deepEqual(
    reload.questions.map((question) => question.promptText),
    ['Условие 1', 'Условие 2', 'Условие 3'],
  );
}

function testResaveSameVersionReplacesQuestionsInsteadOfDuplicating() {
  const initial = simulateSaveAndReload({
    test: { version: 1, title: 'Draft', isPublished: false },
    existingQuestions: [],
    hasAttempts: false,
    payload: buildPayload(1),
  });

  const updatedPayload = buildPayload(2);
  updatedPayload.questions[1]!.promptText = 'Новое условие';

  const resaved = simulateSaveAndReload({
    test: initial.test,
    existingQuestions: initial.questions.map((question) => ({
      appId: question.appId,
      testVersion: question.testVersion,
      sortOrder: question.sortOrder,
      questionType: question.questionType,
      promptText: question.promptText,
      maxPoints: question.maxPoints,
      config: question.config,
      options: question.options,
    })),
    hasAttempts: false,
    payload: updatedPayload,
  });

  assert.equal(resaved.test.version, 1);
  assert.equal(resaved.questions.length, 2);
  assert.equal(resaved.questions[1]?.promptText, 'Новое условие');
}

function testVersionBumpPreservesOldSnapshotVersion() {
  assert.equal(resolveSaveTestVersion(1, false), 1);
  assert.equal(resolveSaveTestVersion(1, true), 2);
  assert.equal(shouldReplaceQuestionsInPlace(1, 1), true);
  assert.equal(shouldReplaceQuestionsInPlace(2, 1), false);

  const withAttempts = simulateSaveAndReload({
    test: { version: 1, title: 'Draft', isPublished: false },
    existingQuestions: [
      {
        appId: 'q-old',
        testVersion: 1,
        sortOrder: 0,
        questionType: 'numeric',
        promptText: 'Старый вопрос',
        maxPoints: 1,
        config: { correctValue: 5, tolerance: 0 },
        options: [],
      },
    ],
    hasAttempts: true,
    payload: buildPayload(1),
  });

  assert.equal(withAttempts.test.version, 2);
  assert.equal(withAttempts.questions.length, 1);
  assert.equal(withAttempts.questions[0]?.testVersion, 2);
}

function testLegacyUnpublishedInputBecomesPublishedOnSave() {
  const saved = simulateSaveAndReload({
    test: { version: 1, title: 'Draft', isPublished: false },
    existingQuestions: [],
    hasAttempts: false,
    payload: {
      title: 'Новый',
      isPublished: false,
      questions: [
        {
          sortOrder: 0,
          questionType: 'numeric',
          promptText: 'F = ma',
          maxPoints: 2,
          config: { correctValue: 10, tolerance: 0 },
          options: [],
        },
      ],
    },
  });

  assert.equal(saved.test.isPublished, true);
  assert.equal(saved.questions[0]?.maxPoints, 2);
}

function run() {
  testNormalizeAlwaysPublishes();
  testFirstSaveAndReloadKeepsThreeQuestions();
  testResaveSameVersionReplacesQuestionsInsteadOfDuplicating();
  testVersionBumpPreservesOldSnapshotVersion();
  testLegacyUnpublishedInputBecomesPublishedOnSave();
  console.log('verify-test-editor-persistence: all checks passed');
}

run();
