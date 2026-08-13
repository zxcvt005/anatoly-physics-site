'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import type {
  AttemptReviewResultStatus,
  CompletedAttemptReview,
} from '@/lib/tests/attempt-review';
import type { StudentAnswerValue, StudentTestQuestion } from '@/types/tests';

type Stage = 'attempt1' | 'attempt1Summary' | 'attempt2' | 'result';

interface TestTakingFlowProps {
  token: string;
  testId: string;
  attemptId?: string;
  assignmentId?: string;
  source: 'lesson' | 'self';
  title: string;
  viewResult?: boolean;
  onClose: () => void;
  onReturnToCatalog?: () => void;
}

export function TestTakingFlow({
  token,
  testId,
  attemptId: initialAttemptId,
  assignmentId,
  source,
  title,
  viewResult,
  onClose,
  onReturnToCatalog,
}: TestTakingFlowProps) {
  const [attemptId, setAttemptId] = useState(initialAttemptId);
  const [stage, setStage] = useState<Stage>('attempt1');
  const [questions, setQuestions] = useState<StudentTestQuestion[]>([]);
  const [stage2Questions, setStage2Questions] = useState<StudentTestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, StudentAnswerValue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempt1Summary, setAttempt1Summary] = useState<{
    correct: number;
    total: number;
    errorCount: number;
  } | null>(null);
  const [result, setResult] = useState<{
    firstAttemptCorrect: number;
    firstAttemptTotal: number;
    secondAttemptFixed?: number;
    secondAttemptUnknown?: number;
    finalScore?: number;
    finalMaxScore?: number;
    finalPercent?: number;
  } | null>(null);
  const [review, setReview] = useState<CompletedAttemptReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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

  const loadReview = useCallback(
    async (targetAttemptId: string) => {
      setReviewLoading(true);
      setReviewError(null);

      const response = await fetch(
        `/api/student/${token}/tests/attempts/${targetAttemptId}?view=review`,
        { cache: 'no-store' },
      );
      const body = await response.json();

      setReviewLoading(false);

      if (!body.ok) {
        setReviewError(body.error ?? 'Не удалось загрузить разбор');
        return;
      }

      setReview(body.data);
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

        if (body.data.attempt.stage === 'completed' || viewResult) {
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
          void loadReview(initialAttemptId);
          return;
        }

        setQuestions(body.data.questions);
        setStage2Questions(body.data.questions);
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
  }, [apiPost, assignmentId, initialAttemptId, loadReview, source, testId, token, viewResult]);

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
    if (!attemptId || loading || stage === 'result' || stage === 'attempt1Summary') return;
    const timer = window.setTimeout(() => {
      void saveDraft();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [answers, attemptId, loading, saveDraft, stage]);

  const activeQuestions = stage === 'attempt2' ? stage2Questions : questions;

  const allAnswered = useMemo(() => {
    return activeQuestions.every((question) => answers[question.id] !== undefined);
  }, [activeQuestions, answers]);

  const submitAttemptOne = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const body = await apiPost({
      action: 'submit_attempt_1',
      attemptId,
      answers: questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? { type: 'short_text', value: '' },
      })),
    });

    setSubmitting(false);

    if (!body.ok) {
      setSubmitError(body.error ?? 'Не удалось проверить ответы. Попробуйте ещё раз.');
      return;
    }

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
      void loadReview(attemptId);
      return;
    }

    const errorCount = body.data.wrongQuestionIds?.length ?? 0;
    setStage2Questions(body.data.questions ?? []);
    setAttempt1Summary({
      correct: body.data.firstAttemptCorrect,
      total: body.data.firstAttemptTotal,
      errorCount,
    });
    setAnswers({});
    setStage('attempt1Summary');
  };

  const beginAttemptTwo = () => {
    setQuestions(stage2Questions);
    setStage('attempt2');
  };

  const submitAttemptTwo = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const body = await apiPost({
      action: 'submit_attempt_2',
      attemptId,
      answers: stage2Questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? { type: 'unknown' },
      })),
    });

    setSubmitting(false);

    if (!body.ok) {
      setSubmitError(body.error ?? 'Не удалось проверить ответы. Попробуйте ещё раз.');
      return;
    }

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
    void loadReview(attemptId);
  };

  const handleReturnToCatalog = () => {
    if (onReturnToCatalog) {
      onReturnToCatalog();
      return;
    }
    onClose();
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

  if (stage === 'attempt1Summary' && attempt1Summary) {
    const percent =
      attempt1Summary.total > 0
        ? Math.round((attempt1Summary.correct / attempt1Summary.total) * 100)
        : 0;

    return (
      <div className="flex min-h-[50vh] items-center justify-center px-2 py-8">
        <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900/90 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white">Первая попытка завершена</h3>
          <p className="mt-1 text-sm text-zinc-400">{title}</p>
          <div className="mt-5 space-y-2 text-sm text-zinc-200">
            <p>
              Верно: {attempt1Summary.correct} из {attempt1Summary.total}
            </p>
            <p>Результат: {percent}%</p>
            <p>Ошибок: {attempt1Summary.errorCount}</p>
          </div>
          <button
            type="button"
            onClick={beginAttemptTwo}
            className="mt-6 w-full rounded-xl bg-[#3166F0] py-3 text-sm font-semibold text-white"
          >
            Попробовать исправить ошибки
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'result' && result) {
    const remainingWrong = (result.finalMaxScore ?? 0) - (result.finalScore ?? 0);

    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
        <h3 className="text-xl font-semibold text-white">Домашнее задание завершено</h3>
        <p className="mt-1 text-zinc-400">{title}</p>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-200">
          <p className="text-lg font-semibold text-white">
            Итоговый результат: {result.finalScore} / {result.finalMaxScore} (
            {Math.round(result.finalPercent ?? 0)}%)
          </p>
          <div className="mt-3 space-y-1">
            <p>
              Первая попытка: {result.firstAttemptCorrect} / {result.firstAttemptTotal}
            </p>
            <p>Исправлено со второй попытки: {result.secondAttemptFixed ?? 0}</p>
            <p>Осталось неверных: {remainingWrong}</p>
          </div>
        </div>

        {reviewLoading && (
          <p className="mt-6 text-sm text-zinc-500">Загрузка разбора...</p>
        )}
        {reviewError && (
          <p className="mt-6 text-sm text-red-300" role="alert">
            {reviewError}
          </p>
        )}

        {review && (
          <div className="mt-8">
            <h4 className="text-base font-semibold text-white">Все задания теста</h4>
            <div className="mt-4 space-y-4">
              {review.questions.map((question, index) => (
                <ReviewQuestionCard key={question.questionId} index={index + 1} question={question} />
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleReturnToCatalog}
          className="mt-8 w-full rounded-xl bg-[#3166F0] py-3 text-sm font-semibold text-white sm:w-auto sm:px-6"
        >
          Вернуться к списку тестов
        </button>
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
          : `Вторая попытка — исправьте ${stage2Questions.length} заданий`}
      </p>

      <div className="mt-6 space-y-6">
        {activeQuestions.map((question, index) => (
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

      <div className="mt-6 space-y-3">
        {stage === 'attempt1' ? (
          <button
            type="button"
            disabled={!allAnswered || submitting}
            onClick={() => void submitAttemptOne()}
            className="w-full rounded-xl bg-[#3166F0] py-3 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto sm:px-6"
          >
            {submitting ? 'Проверяем…' : 'Проверить ответы'}
          </button>
        ) : (
          <button
            type="button"
            disabled={!allAnswered || submitting}
            onClick={() => void submitAttemptTwo()}
            className="w-full rounded-xl bg-[#3166F0] py-3 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto sm:px-6"
          >
            {submitting ? 'Проверяем…' : 'Завершить тест'}
          </button>
        )}
        {submitError && (
          <p className="text-sm text-red-300" role="alert">
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}

function reviewStatusStyles(status: AttemptReviewResultStatus): string {
  switch (status) {
    case 'correct_first':
      return 'border-emerald-500/30 bg-emerald-500/10';
    case 'corrected_second':
      return 'border-amber-500/30 bg-amber-500/10';
    default:
      return 'border-red-500/30 bg-red-500/10';
  }
}

function reviewStatusTextStyles(status: AttemptReviewResultStatus): string {
  switch (status) {
    case 'correct_first':
      return 'text-emerald-300';
    case 'corrected_second':
      return 'text-amber-300';
    default:
      return 'text-red-300';
  }
}

function ReviewQuestionCard({
  index,
  question,
}: {
  index: number;
  question: CompletedAttemptReview['questions'][number];
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${reviewStatusStyles(question.resultStatus)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-white">
          {index}. {question.promptText}
        </p>
        <span
          className={`shrink-0 text-xs font-semibold uppercase tracking-wide ${reviewStatusTextStyles(question.resultStatus)}`}
        >
          {question.resultLabel}
        </span>
      </div>

      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.imageUrl}
          alt=""
          className="mt-3 max-h-48 rounded-xl border border-zinc-800 object-contain"
        />
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-zinc-500">Правильный ответ</dt>
          <dd className="text-zinc-100">{question.correctAnswerDisplay}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Первая попытка</dt>
          <dd className="text-zinc-200">{question.firstAttemptAnswerDisplay}</dd>
        </div>
        {question.secondAttemptAnswerDisplay !== undefined && (
          <div>
            <dt className="text-zinc-500">Вторая попытка</dt>
            <dd className="text-zinc-200">{question.secondAttemptAnswerDisplay}</dd>
          </div>
        )}
      </dl>
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
        {index}. {question.promptText.trim() || `Задание ${index}`}
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
