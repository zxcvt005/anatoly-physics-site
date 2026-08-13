'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import type { StudentAnswerValue, StudentTestQuestion } from '@/types/tests';

type Stage = 'attempt1' | 'attempt2' | 'result';

interface TestTakingFlowProps {
  token: string;
  testId: string;
  attemptId?: string;
  assignmentId?: string;
  source: 'lesson' | 'self';
  title: string;
  onClose: () => void;
}

export function TestTakingFlow({
  token,
  testId,
  attemptId: initialAttemptId,
  assignmentId,
  source,
  title,
  onClose,
}: TestTakingFlowProps) {
  const [attemptId, setAttemptId] = useState(initialAttemptId);
  const [stage, setStage] = useState<Stage>('attempt1');
  const [questions, setQuestions] = useState<StudentTestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, StudentAnswerValue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    firstAttemptCorrect: number;
    firstAttemptTotal: number;
    secondAttemptFixed?: number;
    secondAttemptUnknown?: number;
    finalScore?: number;
    finalMaxScore?: number;
    finalPercent?: number;
  } | null>(null);

  const apiPost = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch(`/api/student/${token}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    [token],
  );

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setLoading(true);
      setError(null);

      if (initialAttemptId) {
        const response = await fetch(
          `/api/student/${token}/tests/attempts/${initialAttemptId}`,
          { cache: 'no-store' },
        );
        const body = await response.json();
        if (cancelled) return;

        if (!body.ok) {
          setError(body.error ?? 'Не удалось загрузить тест');
          setLoading(false);
          return;
        }

        setAttemptId(initialAttemptId);

        if (body.data.attempt.stage === 'completed') {
          setResult({
            firstAttemptCorrect: body.data.attempt.firstAttemptCorrect ?? 0,
            firstAttemptTotal: body.data.attempt.firstAttemptTotal ?? 0,
            secondAttemptFixed: body.data.attempt.secondAttemptFixed,
            secondAttemptUnknown: body.data.attempt.secondAttemptUnknown,
            finalScore: body.data.attempt.finalScore,
            finalMaxScore: body.data.attempt.finalMaxScore,
            finalPercent: body.data.attempt.finalPercent,
          });
          setStage('result');
          setLoading(false);
          return;
        }

        setQuestions(body.data.questions);
        const draft: Record<string, StudentAnswerValue> = {};
        for (const entry of body.data.draftAnswers ?? []) {
          draft[entry.questionId] = entry.answer;
        }
        setAnswers(draft);
        setStage(body.data.attempt.stage === 'draft_2' ? 'attempt2' : 'attempt1');
        setLoading(false);
        return;
      }

      const started = await apiPost({
        action: 'start',
        testId,
        assignmentId,
        source,
      });

      if (cancelled) return;

      if (!started.ok) {
        setError(started.error ?? 'Не удалось начать тест');
        setLoading(false);
        return;
      }

      setAttemptId(started.data.attemptId);
      setQuestions(started.data.questions);
      setLoading(false);
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [apiPost, assignmentId, initialAttemptId, source, testId, token]);

  const saveDraft = useCallback(async () => {
    if (!attemptId) return;
    await apiPost({
      action: 'save_draft',
      attemptId,
      attemptNumber: stage === 'attempt2' ? 2 : 1,
      answers: Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      })),
    });
  }, [answers, apiPost, attemptId, stage]);

  useEffect(() => {
    if (!attemptId || loading || stage === 'result') return;
    const timer = window.setTimeout(() => {
      void saveDraft();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [answers, attemptId, loading, saveDraft, stage]);

  const allAnswered = useMemo(() => {
    return questions.every((question) => answers[question.id] !== undefined);
  }, [answers, questions]);

  const submitAttemptOne = async () => {
    if (!attemptId) return;
    setSubmitting(true);

    const body = await apiPost({
      action: 'submit_attempt_1',
      attemptId,
      answers: questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? { type: 'short_text', value: '' },
      })),
    });

    setSubmitting(false);
    if (!body.ok) return;

    if (body.data.stage === 'completed') {
      const stats = body.data.stats ?? {
        firstAttemptCorrect: body.data.firstAttemptCorrect,
        firstAttemptTotal: body.data.firstAttemptTotal,
        secondAttemptFixed: 0,
        secondAttemptUnknown: 0,
        finalScore: body.data.firstAttemptCorrect,
        finalMaxScore: body.data.firstAttemptTotal,
        finalPercent:
          body.data.firstAttemptTotal > 0
            ? Math.round(
                (body.data.firstAttemptCorrect / body.data.firstAttemptTotal) * 10000,
              ) / 100
            : 0,
      };
      setResult({
        firstAttemptCorrect: stats.firstAttemptCorrect,
        firstAttemptTotal: stats.firstAttemptTotal,
        secondAttemptFixed: stats.secondAttemptFixed,
        secondAttemptUnknown: stats.secondAttemptUnknown,
        finalScore: stats.finalScore,
        finalMaxScore: stats.finalMaxScore,
        finalPercent: stats.finalPercent,
      });
      setStage('result');
      return;
    }

    setQuestions(body.data.questions);
    setAnswers({});
    setStage('attempt2');
  };

  const submitAttemptTwo = async () => {
    if (!attemptId) return;
    setSubmitting(true);

    const body = await apiPost({
      action: 'submit_attempt_2',
      attemptId,
      answers: questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? { type: 'unknown' },
      })),
    });

    setSubmitting(false);
    if (!body.ok) return;

    setResult({
      firstAttemptCorrect: body.data.stats.firstAttemptCorrect,
      firstAttemptTotal: body.data.stats.firstAttemptTotal,
      secondAttemptFixed: body.data.stats.secondAttemptFixed,
      secondAttemptUnknown: body.data.stats.secondAttemptUnknown,
      finalScore: body.data.stats.finalScore,
      finalMaxScore: body.data.stats.finalMaxScore,
      finalPercent: body.data.stats.finalPercent,
    });
    setStage('result');
  };

  if (loading) {
    return <p className="text-sm text-zinc-500">Загрузка теста...</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-6">
        <button type="button" onClick={onClose} className="mb-4 text-sm text-zinc-400">
          ← Назад
        </button>
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (stage === 'result' && result) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
        <button type="button" onClick={onClose} className="mb-4 text-sm text-zinc-400">
          ← Назад
        </button>
        <h3 className="text-xl font-semibold text-white">Домашнее задание завершено</h3>
        <p className="mt-1 text-zinc-400">{title}</p>
        <div className="mt-6 space-y-2 text-sm text-zinc-200">
          <p>
            Первая попытка: {result.firstAttemptCorrect} / {result.firstAttemptTotal}
          </p>
          <p>Исправлено со второй попытки: {result.secondAttemptFixed ?? 0}</p>
          <p>Не решено: {result.secondAttemptUnknown ?? 0}</p>
          <p className="text-lg font-semibold text-white">
            Итоговый результат: {result.finalScore} / {result.finalMaxScore} (
            {Math.round(result.finalPercent ?? 0)}%)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
      <button
        type="button"
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500">
        {stage === 'attempt1'
          ? 'Первая попытка — ответьте на все задания'
          : 'Вторая попытка — оставшиеся задания'}
      </p>

      <div className="mt-6 space-y-6">
        {questions.map((question, index) => (
          <QuestionBlock
            key={question.id}
            index={index + 1}
            question={question}
            value={answers[question.id]}
            onChange={(answer) =>
              setAnswers((current) => ({ ...current, [question.id]: answer }))
            }
            showUnknown={stage === 'attempt2'}
            onUnknown={() =>
              setAnswers((current) => ({
                ...current,
                [question.id]: { type: 'unknown' },
              }))
            }
          />
        ))}
      </div>

      <div className="mt-6">
        {stage === 'attempt1' ? (
          <button
            type="button"
            disabled={!allAnswered || submitting}
            onClick={() => void submitAttemptOne()}
            className="w-full rounded-xl bg-[#3166F0] py-3 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto sm:px-6"
          >
            Проверить ответы
          </button>
        ) : (
          <button
            type="button"
            disabled={!allAnswered || submitting}
            onClick={() => void submitAttemptTwo()}
            className="w-full rounded-xl bg-[#3166F0] py-3 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto sm:px-6"
          >
            Завершить тест
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({
  index,
  question,
  value,
  onChange,
  showUnknown,
  onUnknown,
}: {
  index: number;
  question: StudentTestQuestion;
  value?: StudentAnswerValue;
  onChange: (value: StudentAnswerValue) => void;
  showUnknown: boolean;
  onUnknown: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-sm font-medium text-white">
        {index}. {question.promptText}
      </p>
      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.imageUrl}
          alt=""
          className="mt-3 max-h-48 rounded-xl border border-zinc-800 object-contain"
        />
      )}

      <div className="mt-4 space-y-2">
        {question.questionType === 'numeric' && (
          <input
            inputMode="decimal"
            value={value?.type === 'numeric' ? value.value : ''}
            onChange={(event) => onChange({ type: 'numeric', value: event.target.value })}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            placeholder="Введите число"
          />
        )}

        {question.questionType === 'short_text' && (
          <input
            value={value?.type === 'short_text' ? value.value : ''}
            onChange={(event) => onChange({ type: 'short_text', value: event.target.value })}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            placeholder="Ваш ответ"
          />
        )}

        {question.questionType === 'single_choice' &&
          question.options.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                checked={value?.type === 'single_choice' && value.optionId === option.id}
                onChange={() => onChange({ type: 'single_choice', optionId: option.id })}
              />
              {option.labelText}
            </label>
          ))}

        {question.questionType === 'multiple_choice' &&
          question.options.map((option) => {
            const selected =
              value?.type === 'multiple_choice' ? value.optionIds : [];
            const checked = selected.includes(option.id);
            return (
              <label key={option.id} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selected.filter((id) => id !== option.id)
                      : [...selected, option.id];
                    onChange({ type: 'multiple_choice', optionIds: next });
                  }}
                />
                {option.labelText}
              </label>
            );
          })}

        {question.questionType === 'matching' && (
          <div className="space-y-3">
            {question.options
              .filter((option) => option.matchKey === 'left')
              .map((left) => (
                <div key={left.id} className="grid gap-2 sm:grid-cols-2">
                  <span className="rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-200">
                    {left.labelText}
                  </span>
                  <select
                    value={
                      value?.type === 'matching'
                        ? value.pairs.find((pair) => pair.leftOptionId === left.id)
                            ?.rightOptionId ?? ''
                        : ''
                    }
                    onChange={(event) => {
                      const currentPairs =
                        value?.type === 'matching' ? [...value.pairs] : [];
                      const filtered = currentPairs.filter(
                        (pair) => pair.leftOptionId !== left.id,
                      );
                      if (event.target.value) {
                        filtered.push({
                          leftOptionId: left.id,
                          rightOptionId: event.target.value,
                        });
                      }
                      onChange({ type: 'matching', pairs: filtered });
                    }}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Выберите...</option>
                    {question.options
                      .filter((option) => option.matchKey === 'right')
                      .map((right) => (
                        <option key={right.id} value={right.id}>
                          {right.labelText}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
          </div>
        )}
      </div>

      {showUnknown && (
        <button
          type="button"
          onClick={onUnknown}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300"
        >
          <HelpCircle className="h-4 w-4" />
          Не знаю ответ
        </button>
      )}
    </div>
  );
}
