'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, Search, X } from 'lucide-react';
import { CrmAttemptReviewPanel } from '@/components/tutor/CrmAttemptReviewPanel';
import {
  fetchCrmAttemptReview,
  fetchCrmGradesOverview,
  fetchCrmStudentGrades,
} from '@/lib/crm/api/grades';
import {
  CRM_GRADES_SORT_OPTIONS,
  matchesGradesStudentSearch,
  scoreTone,
  sortStudentGradesCards,
  type CrmGradeHomeworkItem,
  type CrmGradesSortId,
  type CrmStudentGradesCard,
} from '@/lib/tests/crm-grades';
import type { CompletedAttemptReview } from '@/lib/tests/attempt-review';
import { formatDateShort } from '@/lib/tutor-calculations';

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

function HomeworkScore({
  item,
}: {
  item: Pick<CrmGradeHomeworkItem, 'finalScore' | 'finalMaxScore' | 'finalPercent'>;
}) {
  return (
    <div className="flex shrink-0 items-baseline gap-2">
      <p className="text-base font-semibold tabular-nums text-white sm:text-lg">
        <span>{item.finalScore}</span>
        <span className="text-zinc-500"> / {item.finalMaxScore}</span>
      </p>
      <span
        className={`rounded-lg border px-2 py-0.5 text-xs font-semibold tabular-nums ${percentBadgeClass(item.finalPercent)}`}
      >
        {formatPercent(item.finalPercent)}
      </span>
    </div>
  );
}

function HomeworkRow({
  item,
  onDetails,
}: {
  item: CrmGradeHomeworkItem;
  onDetails: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-zinc-800/80 py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{item.topicTitle}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {item.completedAt ? formatDateShort(item.completedAt) : 'Дата неизвестна'}
          {item.sectionTitle ? ` · ${item.sectionTitle}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <HomeworkScore item={item} />
        <button
          type="button"
          onClick={onDetails}
          className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
        >
          Подробнее
        </button>
      </div>
    </div>
  );
}

function StudentGradesCardView({
  card,
  onMore,
  onDetails,
}: {
  card: CrmStudentGradesCard;
  onMore: () => void;
  onDetails: (item: CrmGradeHomeworkItem) => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{card.studentName}</h3>
        <p className="text-sm text-zinc-400">
          Средний{' '}
          <span
            className={`font-semibold tabular-nums ${
              card.avgPercent === null ? 'text-zinc-500' : 'text-[#9eb6ff]'
            }`}
          >
            {formatPercent(card.avgPercent)}
          </span>
        </p>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Последние ДЗ
      </p>

      {card.recent.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Нет выполненных ДЗ</p>
      ) : (
        <div className="mt-2">
          {card.recent.map((item) => (
            <HomeworkRow
              key={item.attemptId}
              item={item}
              onDetails={() => onDetails(item)}
            />
          ))}
        </div>
      )}

      {card.completedCount > 0 && (
        <div className="mt-2 flex justify-end border-t border-zinc-800/80 pt-3">
          <button
            type="button"
            onClick={onMore}
            className="text-sm font-medium text-[#6B93FF] transition hover:text-[#9eb6ff]"
          >
            Ещё →
          </button>
        </div>
      )}
    </article>
  );
}

export function GradesCenter() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [students, setStudents] = useState<CrmStudentGradesCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortId, setSortId] = useState<CrmGradesSortId>('name');

  const [view, setView] = useState<'list' | 'student'>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [studentDetailError, setStudentDetailError] = useState<string | null>(
    null,
  );
  const [studentDetail, setStudentDetail] = useState<{
    studentId: string;
    studentName: string;
    avgPercent: number | null;
    completedCount: number;
    latestPercent: number | null;
    recentTrend: number[];
    items: CrmGradeHomeworkItem[];
  } | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [review, setReview] = useState<CompletedAttemptReview | null>(null);
  const [reviewCompletedAt, setReviewCompletedAt] = useState<string | undefined>();

  const close = useCallback(() => {
    setOpen(false);
    setView('list');
    setSelectedStudentId(null);
    setStudentDetail(null);
    setReviewOpen(false);
    setReview(null);
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchCrmGradesOverview();
      if (!result.ok) {
        setLoadError(result.error);
        setStudents([]);
        return;
      }
      setStudents(result.data.students);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadOverview();
  }, [open, loadOverview]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (reviewOpen) {
        setReviewOpen(false);
        setReview(null);
        return;
      }
      if (view === 'student') {
        setView('list');
        setSelectedStudentId(null);
        setStudentDetail(null);
        return;
      }
      close();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, reviewOpen, view, close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const filteredStudents = useMemo(() => {
    const matched = students.filter((card) =>
      matchesGradesStudentSearch(card.studentName, searchQuery),
    );
    return sortStudentGradesCards(matched, sortId);
  }, [students, searchQuery, sortId]);

  const openStudentAll = async (studentId: string) => {
    setView('student');
    setSelectedStudentId(studentId);
    setStudentDetail(null);
    setStudentDetailError(null);
    setStudentDetailLoading(true);

    try {
      const result = await fetchCrmStudentGrades(studentId);
      if (!result.ok) {
        setStudentDetailError(result.error);
        return;
      }
      setStudentDetail(result.data);
    } finally {
      setStudentDetailLoading(false);
    }
  };

  const openReview = async (
    studentId: string,
    item: CrmGradeHomeworkItem,
  ) => {
    setReviewOpen(true);
    setReview(null);
    setReviewError(null);
    setReviewCompletedAt(item.completedAt);
    setReviewLoading(true);

    try {
      const result = await fetchCrmAttemptReview(studentId, item.attemptId);
      if (!result.ok) {
        setReviewError(result.error);
        return;
      }
      setReview(result.data);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
      >
        <ClipboardList className="h-4 w-4 text-[#6B93FF]" />
        <span>Оценки</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-3 sm:p-4 md:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
            aria-label="Закрыть оценки"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-grades-title"
            className="relative z-10 flex h-full w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                {view === 'student' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setView('list');
                      setSelectedStudentId(null);
                      setStudentDetail(null);
                    }}
                    className="mb-2 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Оценки
                  </button>
                ) : null}
                <h2
                  id="crm-grades-title"
                  className="truncate text-xl font-semibold text-white"
                >
                  {view === 'student'
                    ? (studentDetail?.studentName ??
                      students.find((s) => s.studentId === selectedStudentId)
                        ?.studentName ??
                      'Ученик')
                    : 'Оценки'}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {view === 'student'
                    ? 'Все выполненные ДЗ'
                    : 'Результаты домашних заданий учеников расписания'}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-zinc-700 p-2 text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {view === 'list' && (
              <div className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
                <label className="relative block min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Поиск по имени"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition focus:border-[#3166F0] focus:ring-2 focus:ring-[#3166F0]/30"
                  />
                </label>
                <select
                  value={sortId}
                  onChange={(event) =>
                    setSortId(event.target.value as CrmGradesSortId)
                  }
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-[#3166F0]"
                  aria-label="Сортировка"
                >
                  {CRM_GRADES_SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {view === 'list' && (
                <>
                  {loading && (
                    <p className="text-sm text-zinc-500">Загрузка…</p>
                  )}
                  {loadError && (
                    <p className="text-sm text-red-300" role="alert">
                      {loadError}
                    </p>
                  )}
                  {!loading && !loadError && filteredStudents.length === 0 && (
                    <p className="text-sm text-zinc-500">
                      {students.length === 0
                        ? 'В расписании пока нет учеников'
                        : 'Никого не найдено'}
                    </p>
                  )}
                  <div className="space-y-4">
                    {filteredStudents.map((card) => (
                      <StudentGradesCardView
                        key={card.studentId}
                        card={card}
                        onMore={() => void openStudentAll(card.studentId)}
                        onDetails={(item) =>
                          void openReview(card.studentId, item)
                        }
                      />
                    ))}
                  </div>
                </>
              )}

              {view === 'student' && (
                <>
                  {studentDetailLoading && (
                    <p className="text-sm text-zinc-500">Загрузка…</p>
                  )}
                  {studentDetailError && (
                    <p className="text-sm text-red-300" role="alert">
                      {studentDetailError}
                    </p>
                  )}
                  {studentDetail && (
                    <div className="space-y-6">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                          <p className="text-xs uppercase tracking-wider text-zinc-500">
                            Средний результат
                          </p>
                          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                            {formatPercent(studentDetail.avgPercent)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                          <p className="text-xs uppercase tracking-wider text-zinc-500">
                            Выполнено ДЗ
                          </p>
                          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                            {studentDetail.completedCount}
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                          <p className="text-xs uppercase tracking-wider text-zinc-500">
                            Последний результат
                          </p>
                          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                            {formatPercent(studentDetail.latestPercent)}
                          </p>
                        </div>
                      </div>

                      {studentDetail.recentTrend.length > 1 && (
                        <p className="text-sm text-zinc-400">
                          Динамика:{' '}
                          <span className="tabular-nums text-[#9eb6ff]">
                            {studentDetail.recentTrend
                              .map((value) => `${Math.round(value)}%`)
                              .join(' → ')}
                          </span>
                        </p>
                      )}

                      {studentDetail.items.length === 0 ? (
                        <p className="text-sm text-zinc-500">
                          Нет выполненных ДЗ
                        </p>
                      ) : (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-1 sm:px-5">
                          {studentDetail.items.map((item) => (
                            <HomeworkRow
                              key={item.attemptId}
                              item={item}
                              onDetails={() =>
                                void openReview(studentDetail.studentId, item)
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {reviewOpen && (
            <div className="absolute inset-0 z-20 flex items-stretch justify-center p-0 sm:p-4 md:p-8">
              <button
                type="button"
                className="absolute inset-0 bg-black/80"
                onClick={() => {
                  setReviewOpen(false);
                  setReview(null);
                }}
                aria-label="Закрыть подробности"
              />
              <section
                role="dialog"
                aria-modal="true"
                aria-label="Подробная статистика ДЗ"
                className="relative z-10 flex h-full w-full max-w-[760px] flex-col overflow-hidden rounded-none border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-2xl sm:border"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6">
                  <h3 className="text-lg font-semibold text-white">Подробнее</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewOpen(false);
                      setReview(null);
                    }}
                    className="rounded-xl border border-zinc-700 p-2 text-zinc-400 transition hover:text-white"
                    aria-label="Закрыть"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  {reviewLoading && (
                    <p className="text-sm text-zinc-500">Загрузка разбора…</p>
                  )}
                  {reviewError && (
                    <p className="text-sm text-red-300" role="alert">
                      {reviewError}
                    </p>
                  )}
                  {review && (
                    <CrmAttemptReviewPanel
                      review={review}
                      completedAtLabel={
                        reviewCompletedAt
                          ? `Выполнено ${formatDateShort(reviewCompletedAt)}`
                          : undefined
                      }
                    />
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </>
  );
}
