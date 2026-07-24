'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, History, X } from 'lucide-react';
import { CollapsiblePanel } from '@/components/tutor/CollapsiblePanel';
import {
  buildLessonHistoryGroups,
  getLessonHeldLabel,
  getLessonHeldStatus,
  getStudentDisplayName,
  LESSON_TYPE_LABELS,
} from '@/lib/lesson-history';
import { TransferLessonModal } from '@/components/tutor/TransferLessonModal';
import {
  formatTransferTargetLabel,
  getTransferPickerLessons,
} from '@/lib/lesson-transfer';
import { formatLessonTimeRange } from '@/lib/lesson-datetime';
import {
  formatAttendance,
  formatDateShort,
  formatHomeworkStatus,
} from '@/lib/tutor-calculations';
import { useLessons } from '@/providers/LessonsProvider';
import { useStudents } from '@/providers/StudentsProvider';
import type { Lesson, Student } from '@/types/tutor';

export function AdminHistoryCenter() {
  const { lessons, transferLesson } = useLessons();
  const [transferLessonId, setTransferLessonId] = useState<string | null>(null);
  const { students } = useStudents();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    for (const student of students) {
      map.set(student.id, student);
    }
    return map;
  }, [students]);

  const dayGroups = useMemo(
    () => (open ? buildLessonHistoryGroups(lessons) : []),
    [open, lessons],
  );

  const transferableLessons = useMemo(
    () => getTransferPickerLessons(lessons),
    [lessons],
  );

  const lessonsById = useMemo(() => {
    const map = new Map<string, Lesson>();
    for (const lesson of lessons) {
      map.set(lesson.id, lesson);
    }
    return map;
  }, [lessons]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
      >
        <History className="h-4 w-4 text-[#6B93FF]" />
        <span>История</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-3 sm:p-4 md:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
            aria-label="Закрыть историю"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-history-title"
            className="relative z-10 flex h-full w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div>
                <h2
                  id="admin-history-title"
                  className="text-xl font-semibold text-white"
                >
                  История
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Занятия за последние 14 дней
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <section className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                  Можно перенести
                </h3>
                {transferableLessons.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-sm text-zinc-500">
                    В ближайшие 2 дня нет занятий, доступных для переноса.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {transferableLessons.map((lesson) => (
                      <li
                        key={lesson.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
                      >
                        <div className="min-w-0 text-sm">
                          <p className="font-medium text-white">
                            {getStudentDisplayName(
                              studentsById.get(lesson.studentId),
                            )}
                          </p>
                          <p className="text-[#6B93FF]">
                            {formatDateShort(lesson.date)} ·{' '}
                            {formatLessonTimeRange(lesson)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTransferLessonId(lesson.id)}
                          className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300 transition hover:bg-sky-500/20"
                        >
                          Перенести
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {dayGroups.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
                  <History className="mb-3 h-8 w-8 text-zinc-600" />
                  <p className="text-sm text-zinc-500">
                    За последние 2 недели проведённых занятий нет
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {dayGroups.map((group) => (
                    <section key={group.dateKey}>
                      <h3 className="mb-2 text-sm font-semibold capitalize text-zinc-300">
                        {group.dayLabel}
                      </h3>
                      <ul className="space-y-2">
                        {group.lessons.map((lesson) => (
                          <HistoryLessonRow
                            key={lesson.id}
                            lesson={lesson}
                            student={studentsById.get(lesson.studentId)}
                            lessonsById={lessonsById}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <TransferLessonModal
        open={transferLessonId !== null}
        onClose={() => setTransferLessonId(null)}
        onSubmit={(input) => {
          if (transferLessonId) transferLesson(transferLessonId, input);
        }}
      />
    </>
  );
}

function HistoryLessonRow({
  lesson,
  student,
  lessonsById,
}: {
  lesson: Lesson;
  student?: Student;
  lessonsById: Map<string, Lesson>;
}) {
  const [expanded, setExpanded] = useState(false);
  const heldStatus = getLessonHeldStatus(lesson);
  const makeupSource = lesson.makeupForLessonId
    ? lessonsById.get(lesson.makeupForLessonId)
    : null;
  const transferTarget = lesson.transferredToLessonId
    ? lessonsById.get(lesson.transferredToLessonId)
    : null;
  const transferLabel = formatTransferTargetLabel(transferTarget ?? undefined);

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left sm:px-4"
      >
        <span className="w-12 shrink-0 text-sm font-medium text-[#6B93FF]">
          {formatLessonTimeRange(lesson)}
        </span>

        <span className="min-w-0 flex-1 truncate text-sm text-white">
          {getStudentDisplayName(student)}
        </span>

        <div className="hidden flex-wrap justify-end gap-1 sm:flex">
          <HeldStatusBadge status={heldStatus} />
          {lesson.attendance === 'absent' && <AbsentBadge />}
          {lesson.lessonType !== 'regular' && (
            <LessonTypeBadge lessonType={lesson.lessonType} />
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div className="flex flex-wrap gap-1 px-3 pb-2 sm:hidden">
        <HeldStatusBadge status={heldStatus} />
        {lesson.attendance === 'absent' && <AbsentBadge />}
        {lesson.lessonType !== 'regular' && (
          <LessonTypeBadge lessonType={lesson.lessonType} />
        )}
      </div>

      <CollapsiblePanel open={expanded}>
        <div className="border-t border-zinc-800 px-3 py-3 text-sm sm:px-4">
          <dl className="space-y-2 text-zinc-400">
            <DetailRow label="Тема" value={lesson.topic ?? 'Не указана'} />
            <DetailRow
              label="Посещение"
              value={formatAttendance(lesson.attendance)}
            />
            <DetailRow
              label="Домашнее задание"
              value={
                lesson.attendance === 'absent'
                  ? '—'
                  : lesson.homeworkStatus === 'not_done'
                    ? 'ДЗ не сделано'
                    : lesson.homeworkStatus === 'done'
                      ? `ДЗ сделано${lesson.homeworkScore !== undefined ? ` · ${lesson.homeworkScore}/10` : ''}`
                      : formatHomeworkStatus(lesson.homeworkStatus)
              }
            />
            {lesson.comment && (
              <DetailRow label="Комментарий" value={lesson.comment} />
            )}
            {lesson.lessonType === 'makeup' && makeupSource && (
              <DetailRow
                label="Отработка за"
                value={`${formatDateShort(makeupSource.date)} · ${formatLessonTimeRange(makeupSource)}`}
              />
            )}
            {transferLabel && (
              <DetailRow label="Перенесено на" value={transferLabel} />
            )}
          </dl>

          {lesson.lessonType === 'extra' && (
            <span className="mt-3 inline-flex rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-300">
              Дополнительное занятие
            </span>
          )}

        </div>
      </CollapsiblePanel>
    </li>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-zinc-300">{value}</dd>
    </div>
  );
}

function HeldStatusBadge({
  status,
}: {
  status: ReturnType<typeof getLessonHeldStatus>;
}) {
  const className =
    status === 'held'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : status === 'transferred'
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
        : 'border-red-500/30 bg-red-500/10 text-red-300';

  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${className}`}
    >
      {getLessonHeldLabel(status)}
    </span>
  );
}

function AbsentBadge() {
  return (
    <span className="inline-flex rounded-md border border-red-500/40 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
      Не был
    </span>
  );
}

function LessonTypeBadge({ lessonType }: { lessonType: Lesson['lessonType'] }) {
  if (lessonType === 'regular') return null;

  const isTransfer = lessonType === 'transfer';

  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
        isTransfer
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
          : 'border-violet-500/30 bg-violet-500/10 text-violet-300'
      }`}
    >
      {LESSON_TYPE_LABELS[lessonType]}
    </span>
  );
}
