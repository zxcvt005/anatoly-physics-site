'use client';

import { useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  saveHomeworkTestByTopic,
  saveIntensiveTest,
} from '@/lib/crm/api/tests';
import { generateOptionId, generateQuestionId } from '@/lib/tests/ids';
import type {
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
}

function createEmptyQuestion(sortOrder: number): SaveTestQuestionInput {
  return {
    id: generateQuestionId(),
    sortOrder,
    questionType: 'numeric',
    promptText: '',
    maxPoints: 1,
    config: { correctValue: 0, tolerance: 0 },
    options: [],
  };
}

export function TestEditorPanel({
  mode,
  topicId,
  intensiveId,
  initial,
  onSaved,
}: TestEditorPanelProps) {
  const [title, setTitle] = useState(initial.test.title);
  const [questions, setQuestions] = useState<SaveTestQuestionInput[]>(
    initial.questions.map((question) => ({
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
    })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const payload: SaveTestInput = {
      title,
      isPublished: true,
      questions: questions.map((question, index) => ({
        ...question,
        sortOrder: index,
      })),
    };

    const result =
      mode === 'homework' && topicId
        ? await saveHomeworkTestByTopic(topicId, payload)
        : mode === 'intensive' && intensiveId
          ? await saveIntensiveTest(intensiveId, payload)
          : { ok: false as const, error: 'Missing entity id' };

    setSaving(false);

    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    onSaved(result.data);
    setTitle(result.data.test.title);
    setQuestions(
      result.data.questions.map((question) => ({
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
      })),
    );
    setMessage('Сохранено');
  };

  return (
    <div className="space-y-4">
      <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0] sm:col-span-2"
          placeholder="Название теста"
        />

      <p className="text-sm text-zinc-400">
        Максимальный балл: <span className="font-semibold text-white">{maxPoints}</span>
      </p>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <div
            key={question.id ?? index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-white">Задание {index + 1}</p>
              <button
                type="button"
                onClick={() =>
                  setQuestions((current) => current.filter((_, i) => i !== index))
                }
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
                  onChange={(event) =>
                    updateQuestion(index, {
                      questionType: event.target.value as TestQuestionType,
                      config:
                        event.target.value === 'numeric'
                          ? { correctValue: 0, tolerance: 0 }
                          : event.target.value === 'short_text'
                            ? { acceptedAnswers: [''], caseInsensitive: true }
                            : {},
                      options:
                        event.target.value === 'single_choice' ||
                        event.target.value === 'multiple_choice' ||
                        event.target.value === 'matching'
                          ? [
                              {
                                id: generateOptionId(),
                                sortOrder: 0,
                                labelText: 'Вариант A',
                                isCorrect: true,
                                matchKey:
                                  event.target.value === 'matching' ? 'left' : undefined,
                              },
                              {
                                id: generateOptionId(),
                                sortOrder: 1,
                                labelText: 'Вариант B',
                                isCorrect: false,
                                matchKey:
                                  event.target.value === 'matching' ? 'right' : undefined,
                              },
                            ]
                          : [],
                    })
                  }
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
                    type="number"
                    step="any"
                    value={(question.config as { correctValue?: number }).correctValue ?? ''}
                    onChange={(event) =>
                      updateQuestion(index, {
                        config: {
                          correctValue: Number(event.target.value),
                          tolerance:
                            (question.config as { tolerance?: number }).tolerance ?? 0,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Погрешность
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={(question.config as { tolerance?: number }).tolerance ?? 0}
                    onChange={(event) =>
                      updateQuestion(index, {
                        config: {
                          correctValue:
                            (question.config as { correctValue?: number }).correctValue ?? 0,
                          tolerance: Number(event.target.value),
                        },
                      })
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
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setQuestions((current) => [...current, createEmptyQuestion(current.length)])
          }
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
          {saving ? 'Сохранение...' : 'Сохранить тест'}
        </button>
      </div>

      {message && <p className="text-sm text-zinc-400">{message}</p>}
    </div>
  );
}
