'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import {
  fetchCrmTestStatsDetail,
  fetchCrmTestStatsList,
} from '@/lib/crm/api/grades';
import { scoreTone } from '@/lib/tests/crm-grades';
import {
  matchesTestStatsSearch,
  sortQuestionStats,
  type CrmTestQuestionSortId,
  type CrmTestQuestionStats,
  type CrmTestStatsDetail,
  type CrmTestStatsListItem,
} from '@/lib/tests/crm-test-stats';

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}%`;
}

function percentBadgeClass(percent: number | null | undefined): string {
  switch (scoreTone(percent)) {
    case 'high':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'mid':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'low':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    default:
      return 'border-zinc-700 bg-zinc-900 text-zinc-400';
  }
}

function TestListCard({
  item,
  onOpen,
}: {
  item: CrmTestStatsListItem;
  onOpen: () => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-white">{item.title}</h3>
          {item.sectionTitle && (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{item.sectionTitle}</p>
          )}
        </div>
        <span
          className={`rounded-lg border px-2.5 py-1 text-sm font-semibold tabular-nums ${percentBadgeClass(item.avgPercent)}`}
        >
          {formatPercent(item.avgPercent)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-zinc-500">Выполнено</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-white">
            {item.completedCount}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Средний результат</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-[#9eb6ff]">
            {formatPercent(item.avgPercent)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex justify-end border-t border-zinc-800/80 pt-3">
        <button
          type="button"
          onClick={onOpen}
          className="text-sm font-medium text-[#6B93FF] transition hover:text-[#9eb6ff]"
        >
          Подробнее →
        </button>
      </div>
    </article>
  );
}

function QuestionStatRow({
  question,
  onOpen,
}: {
  question: CrmTestQuestionStats;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 border-t border-zinc-800/80 py-4 text-left transition first:border-t-0 first:pt-0 hover:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          №{question.number}
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-medium text-white">
          {question.promptText}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Правильных: {question.correct} / {question.attempted}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`rounded-lg border px-2.5 py-1 text-sm font-semibold tabular-nums ${percentBadgeClass(question.correctPercent)}`}
        >
          {formatPercent(question.correctPercent)}
        </span>
        <span className="text-sm text-[#6B93FF]">Подробнее →</span>
      </div>
    </button>
  );
}

function QuestionDetailModal({
  question,
  onClose,
}: {
  question: CrmTestQuestionStats;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-stretch justify-center p-0 sm:p-4 md:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        aria-label="Закрыть статистику задания"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Задание №${question.number}`}
        className="relative z-10 flex h-full w-full max-w-[640px] flex-col overflow-hidden rounded-none border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-2xl sm:border"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6">
          <h3 className="text-lg font-semibold text-white">
            Задание №{question.number}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 p-2 text-zinc-400 transition hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          <div>
            <p className="text-sm leading-relaxed text-zinc-200">
              {question.promptText}
            </p>
            {question.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={question.imageUrl}
                alt=""
                className="mt-3 max-h-56 rounded-xl border border-zinc-800 object-contain"
              />
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Правильный ответ
            </p>
            <p className="mt-1 text-sm text-zinc-100">
              {question.correctAnswerDisplay}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatMini label="Выполняли" value={String(question.attempted)} />
            <StatMini label="Правильно" value={String(question.correct)} />
            <StatMini label="Неправильно" value={String(question.incorrect)} />
            <StatMini label="Пропустили" value={String(question.skipped)} />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Правильность
            </p>
            <p
              className={`mt-2 text-3xl font-semibold tabular-nums ${
                scoreTone(question.correctPercent) === 'low'
                  ? 'text-red-300'
                  : scoreTone(question.correctPercent) === 'mid'
                    ? 'text-amber-200'
                    : 'text-emerald-300'
              }`}
            >
              {formatPercent(question.correctPercent)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

export function GradesTestStatsView({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tests, setTests] = useState<CrmTestStatsListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmTestStatsDetail | null>(null);
  const [questionSort, setQuestionSort] =
    useState<CrmTestQuestionSortId>('difficulty');
  const [selectedQuestion, setSelectedQuestion] =
    useState<CrmTestQuestionStats | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchCrmTestStatsList();
      if (!result.ok) {
        setLoadError(result.error);
        setTests([]);
        return;
      }
      setTests(result.data.tests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filteredTests = useMemo(
    () => tests.filter((item) => matchesTestStatsSearch(item, searchQuery)),
    [tests, searchQuery],
  );

  const openTest = async (testId: string) => {
    setSelectedTestId(testId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    setSelectedQuestion(null);
    setQuestionSort('difficulty');

    try {
      const result = await fetchCrmTestStatsDetail(testId);
      if (!result.ok) {
        setDetailError(result.error);
        return;
      }
      setDetail(result.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const sortedQuestions = useMemo(() => {
    if (!detail) return [];
    return sortQuestionStats(detail.questions, questionSort);
  }, [detail, questionSort]);

  if (selectedTestId) {
    return (
      <div className="relative flex h-full min-h-0 flex-col">
        <div className="border-b border-zinc-800 px-4 py-3 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedTestId(null);
                  setDetail(null);
                  setSelectedQuestion(null);
                }}
                className="mb-2 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Статистика по тестам
              </button>
              <h3 className="truncate text-lg font-semibold text-white sm:text-xl">
                {detail?.title ?? 'Тест'}
              </h3>
              {detail?.sectionTitle && (
                <p className="mt-0.5 text-sm text-zinc-500">{detail.sectionTitle}</p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-700 p-2 text-zinc-400 transition hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {detailLoading && <p className="text-sm text-zinc-500">Загрузка…</p>}
          {detailError && (
            <p className="text-sm text-red-300" role="alert">
              {detailError}
            </p>
          )}
          {detail && (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    Выполнено
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                    {detail.completedCount}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    Средний результат
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-[#9eb6ff]">
                    {formatPercent(detail.avgPercent)}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-base font-semibold text-white">
                    Статистика по заданиям
                  </h4>
                  <div className="flex rounded-xl border border-zinc-700 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setQuestionSort('difficulty')}
                      className={`rounded-lg px-3 py-1.5 transition ${
                        questionSort === 'difficulty'
                          ? 'bg-[#3166F0] text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      По сложности
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionSort('order')}
                      className={`rounded-lg px-3 py-1.5 transition ${
                        questionSort === 'order'
                          ? 'bg-[#3166F0] text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      По номеру
                    </button>
                  </div>
                </div>

                {sortedQuestions.length === 0 ? (
                  <p className="text-sm text-zinc-500">Нет данных по заданиям</p>
                ) : (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 sm:px-5">
                    {sortedQuestions.map((question) => (
                      <QuestionStatRow
                        key={question.questionId}
                        question={question}
                        onOpen={() => setSelectedQuestion(question)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedQuestion && (
          <QuestionDetailModal
            question={selectedQuestion}
            onClose={() => setSelectedQuestion(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-800 px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Оценки
            </button>
            <h3 className="text-lg font-semibold text-white sm:text-xl">
              Статистика по тестам
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              Средние результаты по выполненным ДЗ
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 p-2 text-zinc-400 transition hover:text-white"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-zinc-800 px-4 py-3 sm:px-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по названию"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition focus:border-[#3166F0] focus:ring-2 focus:ring-[#3166F0]/30"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        {loading && <p className="text-sm text-zinc-500">Загрузка…</p>}
        {loadError && (
          <p className="text-sm text-red-300" role="alert">
            {loadError}
          </p>
        )}
        {!loading && !loadError && filteredTests.length === 0 && (
          <p className="text-sm text-zinc-500">
            {tests.length === 0
              ? 'Пока нет выполненных ДЗ'
              : 'Ничего не найдено'}
          </p>
        )}
        <div className="space-y-4">
          {filteredTests.map((item) => (
            <TestListCard
              key={item.testId}
              item={item}
              onOpen={() => void openTest(item.testId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
