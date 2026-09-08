'use client';

import type {
  AttemptReviewResultStatus,
  CompletedAttemptReview,
} from '@/lib/tests/attempt-review';

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

export function CrmAttemptReviewPanel({
  review,
  completedAtLabel,
}: {
  review: CompletedAttemptReview;
  completedAtLabel?: string;
}) {
  const remainingWrong = review.finalMaxScore - review.finalScore;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white">{review.title}</h3>
        {completedAtLabel && (
          <p className="mt-1 text-sm text-zinc-500">{completedAtLabel}</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-200">
        <p className="text-lg font-semibold text-white">
          Итоговый результат: {review.finalScore} / {review.finalMaxScore} (
          {Math.round(review.finalPercent)}%)
        </p>
        <div className="mt-3 space-y-1">
          <p>
            Первая попытка: {review.firstAttemptCorrect} /{' '}
            {review.firstAttemptTotal}
          </p>
          <p>Исправлено со второй попытки: {review.secondAttemptFixed}</p>
          <p>Осталось неверных: {remainingWrong}</p>
        </div>
      </div>

      <div>
        <h4 className="text-base font-semibold text-white">Все задания теста</h4>
        <div className="mt-4 space-y-4">
          {review.questions.map((question, index) => (
            <ReviewQuestionCard
              key={question.questionId}
              index={index + 1}
              question={question}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
