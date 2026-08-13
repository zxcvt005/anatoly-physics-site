'use client';

import { useMemo, useState } from 'react';
import { EyeOff, Plus, Save, Trash2 } from 'lucide-react';
import {
  deleteHomeworkTestByTopic,
  deleteIntensiveTest,
  hideHomeworkTestByTopic,
  hideIntensiveTest,
  saveHomeworkTestByTopic,
  saveIntensiveTest,
} from '@/lib/crm/api/tests';
import { mapTestSaveValidationError } from '@/lib/tests/editor-user-errors';
import { generateOptionId, generateQuestionId } from '@/lib/tests/ids';
import {
  buildNumericDraftFromConfig,
  numericDraftToConfig,
  type NumericEditorDraft,
  validateNumericAnswerDraft,
} from '@/lib/tests/numeric-editor';
import type {
  NumericQuestionConfig,
  SaveTestInput,
  SaveTestQuestionInput,
  TestEditorBundle,
  TestQuestionType,
} from '@/types/tests';

const QUESTION_TYPE_LABELS: Record<TestQuestionType, string> = {
  numeric: 'Числовой ответ',
  short_text: 'Короткий текст',
  single_choice: 'Один вариант',
  multiple_choice: 'Несколько вариантов',
  matching: 'Сопоставление',
};

interface TestEditorPanelProps {
  mode: 'homework' | 'intensive';
  topicId?: string;
  intensiveId?: string;
  initial: TestEditorBundle;
  onSaved: (bundle: TestEditorBundle) => void;
  onSaveSuccess?: () => void;
  onTestRemoved?: () => void;
}

type EditorMessageKind = 'success' | 'error' | 'warning' | 'info';

function questionKey(question: SaveTestQuestionInput, index: number): string {
  return question.id ?? `idx-${index}`;
}

function buildNumericDraftsFromQuestions(
  questions: SaveTestQuestionInput[],
): Record<string, NumericEditorDraft> {
  const drafts: Record<string, NumericEditorDraft> = {};

  questions.forEach((question, index) => {
    if (question.questionType !== 'numeric') return;
    drafts[questionKey(question, index)] = buildNumericDraftFromConfig(
      question.config as NumericQuestionConfig,
    );
  });

  return drafts;
}

function mapBundleQuestions(bundle: TestEditorBundle): SaveTestQuestionInput[] {
  return bundle.questions.map((question) => ({
    id: question.id,
    sortOrder: question.sortOrder,
    questionType: question.questionType,
    promptText: question.promptText,
    imageUrl: question.imageUrl,
    maxPoints: question.maxPoints,
    config: question.config,
    options: question.options.map((option) => ({
      id: option.id,
      sortOrder: option.sortOrder,
      labelText: option.labelText,
      isCorrect: option.isCorrect,
      matchKey: option.matchKey,
    })),
  }));
}

function createEmptyQuestion(sortOrder: number): SaveTestQuestionInput {
  return {
    id: generateQuestionId(),
    sortOrder,
    questionType: 'numeric',
    promptText: '',
    maxPoints: 1,
    config: { tolerance: 0 } as NumericQuestionConfig,
    options: [],
  };
}

export function TestEditorPanel({
  mode,
  topicId,
  intensiveId,
  initial,
  onSaved,
  onSaveSuccess,
  onTestRemoved,
}: TestEditorPanelProps) {
  const hasPersistedTest = Boolean(initial.test.id);

  const [title, setTitle] = useState(initial.test.title);
  const [questions, setQuestions] = useState<SaveTestQuestionInput[]>(() =>
    mapBundleQuestions(initial),
  );
  const [numericDrafts, setNumericDrafts] = useState<Record<string, NumericEditorDraft>>(
    () => buildNumericDraftsFromQuestions(mapBundleQuestions(initial)),
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<EditorMessageKind>('info');

  const maxPoints = useMemo(
    () => questions.reduce((sum, question) => sum + question.maxPoints, 0),
    [questions],
  );

  const updateQuestion = (
    index: number,
    patch: Partial<SaveTestQuestionInput>,
  ) => {
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...patch } : question)),
    );
  };

  const prepareQuestionsForSave = (): SaveTestQuestionInput[] | null => {
    if (questions.length === 0) {
      setMessageKind('error');
      setMessage('Добавьте хотя бы один вопрос');
      return null;
    }

    const prepared: SaveTestQuestionInput[] = [];

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index]!;

      if (!question.promptText.trim()) {
        setMessageKind('error');
        setMessage(`Задание ${index + 1}: Заполните условие`);
        return null;
      }

      if (question.questionType === 'numeric') {
        const draft = numericDrafts[questionKey(question, index)] ?? {
          answer: '',
          tolerance: '0',
        };
        const validationError = validateNumericAnswerDraft(draft.answer);
        if (validationError) {
          setMessageKind('error');
          setMessage(`Задание ${index + 1}: ${validationError}`);
          return null;
        }

        const config = numericDraftToConfig(draft);
        if (!config) {
          setMessageKind('error');
          setMessage(`Задание ${index + 1}: Укажите правильный ответ`);
          return null;
        }

        prepared.push({
          ...question,
          sortOrder: index,
          config,
        });
        continue;
      }

      prepared.push({
        ...question,
        sortOrder: index,
      });
    }

    return prepared;
  };

  const applySavedBundle = (bundle: TestEditorBundle) => {
    const mapped = mapBundleQuestions(bundle);
    setTitle(bundle.test.title);
    setQuestions(mapped);
    setNumericDrafts(buildNumericDraftsFromQuestions(mapped));
    setDeleteBlocked(false);
  };

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    setMessage(null);

    const preparedQuestions = prepareQuestionsForSave();
    if (!preparedQuestions) {
      setSaving(false);
      return;
    }

    const payload: SaveTestInput = {
      title,
      isPublished: true,
      questions: preparedQuestions,
    };

    const result =
      mode === 'homework' && topicId
        ? await saveHomeworkTestByTopic(topicId, payload)
        : mode === 'intensive' && intensiveId
          ? await saveIntensiveTest(intensiveId, payload)
          : { ok: false as const, error: 'Missing entity id' };

    setSaving(false);

    if (!result.ok) {
      setMessageKind('error');
      setMessage(`Не удалось сохранить тест: ${mapTestSaveValidationError(result.error)}`);
      return;
    }

    if (result.data.questions.length === 0) {
      setMessageKind('error');
      setMessage('Не удалось сохранить тест: сервер вернул пустой список вопросов');
      return;
    }

    onSaved(result.data);
    applySavedBundle(result.data);
    if (onSaveSuccess) {
      onSaveSuccess();
      return;
    }

    setMessageKind('success');
    setMessage('Тест сохранён');
  };

  const handleDelete = async () => {
    if (deleting || hiding) return;

    if (
      !hasPersistedTest ||
      !confirm('Удалить тест? Это действие нельзя отменить.')
    ) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    const result =
      mode === 'homework' && topicId
        ? await deleteHomeworkTestByTopic(topicId)
        : mode === 'intensive' && intensiveId
          ? await deleteIntensiveTest(intensiveId)
          : { ok: false as const, error: 'Missing entity id' };

    setDeleting(false);

    if (!result.ok) {
      if (result.code === 'TEST_IN_USE') {
        setDeleteBlocked(true);
        setMessageKind('warning');
      } else {
        setMessageKind('error');
      }
      setMessage(result.error);
      return;
    }

    onTestRemoved?.();
  };

  const handleHide = async () => {
    if (deleting || hiding) return;

    if (
      !hasPersistedTest ||
      !confirm(
        'Скрыть тест? Он исчезнет из каталога учеников, но история результатов сохранится.',
      )
    ) {
      return;
    }

    setHiding(true);
    setMessage(null);

    const result =
      mode === 'homework' && topicId
        ? await hideHomeworkTestByTopic(topicId)
        : mode === 'intensive' && intensiveId
          ? await hideIntensiveTest(intensiveId)
          : { ok: false as const, error: 'Missing entity id' };

    setHiding(false);

    if (!result.ok) {
      setMessageKind('error');
      setMessage(result.error);
      return;
    }

    onTestRemoved?.();
  };

  const handleAddQuestion = () => {
    const question = createEmptyQuestion(questions.length);
    setQuestions((current) => [...current, question]);
    setNumericDrafts((current) => ({
      ...current,
      [question.id!]: { answer: '', tolerance: '0' },
    }));
  };

  const handleRemoveQuestion = (index: number) => {
    const key = questionKey(questions[index]!, index);
    setQuestions((current) => current.filter((_, i) => i !== index));
    setNumericDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
        placeholder="Название теста"
      />

      <p className="text-sm text-zinc-400">
        Максимальный балл: <span className="font-semibold text-white">{maxPoints}</span>
      </p>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const key = questionKey(question, index);
          const numericDraft = numericDrafts[key] ?? { answer: '', tolerance: '0' };

          return (
            <div
              key={key}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">Задание {index + 1}</p>
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(index)}
                  className="inline-flex items-center gap-1 text-xs text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Удалить
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-zinc-500">
                  Тип
                  <select
                    value={question.questionType}
                    onChange={(event) => {
                      const nextType = event.target.value as TestQuestionType;
                      updateQuestion(index, {
                        questionType: nextType,
                        config:
                          nextType === 'numeric'
                            ? ({ tolerance: 0 } as NumericQuestionConfig)
                            : nextType === 'short_text'
                              ? { acceptedAnswers: [''], caseInsensitive: true }
                              : {},
                        options:
                          nextType === 'single_choice' ||
                          nextType === 'multiple_choice' ||
                          nextType === 'matching'
                            ? [
                                {
                                  id: generateOptionId(),
                                  sortOrder: 0,
                                  labelText: 'Вариант A',
                                  isCorrect: true,
                                  matchKey: nextType === 'matching' ? 'left' : undefined,
                                },
                                {
                                  id: generateOptionId(),
                                  sortOrder: 1,
                                  labelText: 'Вариант B',
                                  isCorrect: false,
                                  matchKey: nextType === 'matching' ? 'right' : undefined,
                                },
                              ]
                            : [],
                      });

                      if (nextType === 'numeric') {
                        setNumericDrafts((current) => ({
                          ...current,
                          [key]: { answer: '', tolerance: '0' },
                        }));
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  >
                    {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-zinc-500">
                  Баллы
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={question.maxPoints}
                    onChange={(event) =>
                      updateQuestion(index, { maxPoints: Number(event.target.value) || 1 })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>
              </div>

              <label className="mt-3 block text-xs text-zinc-500">
                Условие
                <textarea
                  value={question.promptText}
                  onChange={(event) =>
                    updateQuestion(index, { promptText: event.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
              </label>

              <label className="mt-3 block text-xs text-zinc-500">
                URL изображения (необязательно)
                <input
                  value={question.imageUrl ?? ''}
                  onChange={(event) =>
                    updateQuestion(index, { imageUrl: event.target.value || undefined })
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
              </label>

              {question.questionType === 'numeric' && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs text-zinc-500">
                    Правильный ответ
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Введите ответ"
                      value={numericDraft.answer}
                      onChange={(event) =>
                        setNumericDrafts((current) => ({
                          ...current,
                          [key]: { ...numericDraft, answer: event.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Погрешность
                    <input
                      type="text"
                      inputMode="decimal"
                      value={numericDraft.tolerance}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) =>
                        setNumericDrafts((current) => ({
                          ...current,
                          [key]: { ...numericDraft, tolerance: event.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>
              )}

              {question.questionType === 'short_text' && (
                <label className="mt-3 block text-xs text-zinc-500">
                  Допустимые ответы (по одному в строке)
                  <textarea
                    value={
                      ((question.config as { acceptedAnswers?: string[] }).acceptedAnswers ?? [
                        '',
                      ]).join('\n')
                    }
                    onChange={(event) =>
                      updateQuestion(index, {
                        config: {
                          acceptedAnswers: event.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean),
                          caseInsensitive: true,
                        },
                      })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>
              )}

              {(question.questionType === 'single_choice' ||
                question.questionType === 'multiple_choice' ||
                question.questionType === 'matching') && (
                <div className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={option.id ?? optionIndex} className="flex flex-wrap gap-2">
                      <input
                        value={option.labelText}
                        onChange={(event) => {
                          const nextOptions = [...question.options];
                          nextOptions[optionIndex] = {
                            ...option,
                            labelText: event.target.value,
                          };
                          updateQuestion(index, { options: nextOptions });
                        }}
                        className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                      />
                      {question.questionType === 'matching' && (
                        <select
                          value={option.matchKey ?? 'left'}
                          onChange={(event) => {
                            const nextOptions = [...question.options];
                            nextOptions[optionIndex] = {
                              ...option,
                              matchKey: event.target.value,
                            };
                            updateQuestion(index, { options: nextOptions });
                          }}
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
                        >
                          <option value="left">Левая</option>
                          <option value="right">Правая</option>
                        </select>
                      )}
                      <label className="flex items-center gap-2 text-xs text-zinc-300">
                        <input
                          type={
                            question.questionType === 'multiple_choice' ? 'checkbox' : 'radio'
                          }
                          name={`correct-${question.id}`}
                          checked={option.isCorrect ?? false}
                          onChange={() => {
                            const nextOptions = question.options.map((item, i) => {
                              if (question.questionType === 'single_choice') {
                                return { ...item, isCorrect: i === optionIndex };
                              }
                              if (i === optionIndex) {
                                return { ...item, isCorrect: !item.isCorrect };
                              }
                              return item;
                            });
                            updateQuestion(index, { options: nextOptions });
                          }}
                        />
                        Верно
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(index, {
                        options: [
                          ...question.options,
                          {
                            id: generateOptionId(),
                            sortOrder: question.options.length,
                            labelText: `Вариант ${question.options.length + 1}`,
                            isCorrect: false,
                            matchKey:
                              question.questionType === 'matching' ? 'left' : undefined,
                          },
                        ],
                      })
                    }
                    className="text-xs text-[#3166F0]"
                  >
                    + Вариант
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAddQuestion}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Добавить вопрос
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3166F0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Сохраняем…' : 'Сохранить тест'}
        </button>
      </div>

      {hasPersistedTest && (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
          <button
            type="button"
            disabled={deleting || hiding}
            onClick={() => void handleDelete()}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Удаление...' : 'Удалить тест'}
          </button>
          {(deleteBlocked || hasPersistedTest) && (
            <button
              type="button"
              disabled={deleting || hiding}
              onClick={() => void handleHide()}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 disabled:opacity-50"
            >
              <EyeOff className="h-4 w-4" />
              {hiding ? 'Скрытие...' : 'Скрыть тест'}
            </button>
          )}
        </div>
      )}

      {message && (
        <p
          className={`text-sm ${
            messageKind === 'success'
              ? 'text-emerald-300'
              : messageKind === 'error'
                ? 'text-red-300'
                : messageKind === 'warning'
                  ? 'text-amber-300'
                  : 'text-zinc-400'
          }`}
          role={messageKind === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
    </div>
  );
}
