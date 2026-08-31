'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  buildSessionSearchParams,
  getHomeworkAction,
  statusLabel,
  type HomeworkTestSession,
} from '@/lib/tests/student-homework-ui';
import { testsSessionPath } from '@/lib/tests/student-navigation';
import { formatDateShort } from '@/lib/tutor-calculations';
import type { StudentHomeworkListItem } from '@/types/tests';

type HomeworkTestCardProps = {
  token: string;
  item: StudentHomeworkListItem;
  sectionTitle?: string;
};

export function HomeworkTestCard({
  token,
  item,
  sectionTitle,
}: HomeworkTestCardProps) {
  const isAssigned = item.source === 'lesson' && item.status !== 'completed';
  const isCompleted = item.status === 'completed';
  const isInProgress = item.status === 'in_progress';
  const action = getHomeworkAction(item);

  const session: HomeworkTestSession | null =
    item.testId && action
      ? {
          testId: item.testId,
          attemptId: action.attemptId,
          assignmentId: item.assignmentId,
          source: item.source ?? 'self',
          title: item.topicTitle,
          viewResult: action.viewResult,
        }
      : null;

  const sessionHref = session
    ? `${testsSessionPath(token)}?${buildSessionSearchParams(session).toString()}`
    : null;

  return (
    <article
      id={`topic-${item.topicId}`}
      className={`group relative overflow-hidden rounded-2xl border backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${
        isAssigned
          ? 'border-[#3166F0]/40 bg-[#3166F0]/10 hover:border-[#3166F0]/60'
          : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-700'
      }`}
    >
      <div
        className={`relative h-2 ${
          isCompleted
            ? 'bg-gradient-to-r from-emerald-500/60 to-emerald-500/20'
            : isInProgress
              ? 'bg-gradient-to-r from-[#3166F0]/60 to-[#3166F0]/20'
              : isAssigned
                ? 'bg-gradient-to-r from-[#3166F0]/80 to-[#3166F0]/30'
                : 'bg-gradient-to-r from-zinc-700/60 to-zinc-700/20'
        }`}
        aria-hidden
      />

      <div className="p-5 sm:p-6">
        {sectionTitle && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {sectionTitle}
          </p>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-white transition group-hover:text-[#3166F0] sm:text-xl">
              {item.topicTitle}
            </h3>

            <p className="mt-2 text-sm text-zinc-400">
              {statusLabel(item.status, item.source)}
              {item.finalPercent !== undefined
                ? ` · ${item.finalScore}/${item.finalMaxScore} (${Math.round(item.finalPercent)}%)`
                : ''}
            </p>

            {item.lessonDate && item.source === 'lesson' && (
              <p className="mt-1 text-xs text-zinc-500">
                Занятие {formatDateShort(item.lessonDate)}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {isAssigned && (
              <span className="inline-flex rounded-full border border-[#3166F0]/40 bg-[#3166F0]/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#9eb6ff]">
                Назначено
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Выполнено
              </span>
            )}
            {isInProgress && (
              <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                В процессе
              </span>
            )}
          </div>
        </div>

        {sessionHref && action ? (
          <div className="mt-5 flex justify-end">
            <Link
              href={sessionHref}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isAssigned
                  ? 'bg-[#3166F0] text-white hover:bg-[#2856d4]'
                  : isCompleted
                    ? 'border border-emerald-500/30 text-emerald-200 hover:border-emerald-500/50 hover:text-emerald-100'
                    : 'border border-zinc-700 text-zinc-200 hover:border-zinc-600 hover:text-white'
              }`}
            >
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Тест для этой темы пока не опубликован
          </p>
        )}
      </div>
    </article>
  );
}
