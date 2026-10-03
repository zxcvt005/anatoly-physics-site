'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, X } from 'lucide-react';
import { AdminTrialLessonFormModal } from '@/components/tutor/AdminTrialLessonFormModal';
import { formatDateShort, formatMoney } from '@/lib/tutor-calculations';
import {
  findStudentByName,
  isStudentInSchedule,
  TRIAL_CALL_STATUS_LABELS,
} from '@/lib/trial-lesson-utils';
import { normalizeTrialLastName } from '@/lib/trial-lessons/form';
import { useScheduleSlots } from '@/providers/ScheduleSlotsProvider';
import {
  useTrialLessons,
  type TrialLessonFormInput,
} from '@/providers/TrialLessonsProvider';
import { useStudents } from '@/providers/StudentsProvider';
import type { TrialCallStatus, TrialLesson } from '@/types/tutor';

export function AdminTrialLessonsCenter() {
  const { trialLessons, addTrialLesson, updateTrialLesson, deleteTrialLesson } =
    useTrialLessons();
  const { students, addStudent, updateStudent } = useStudents();
  const { slots } = useScheduleSlots();
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrial, setEditingTrial] = useState<TrialLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrialLesson | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (formOpen || deleteTarget) return;
    setOpen(false);
  }, [formOpen, deleteTarget]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !formOpen) close();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, formOpen, close]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const rows = useMemo(
    () =>
      trialLessons.map((trial) => {
        const linkedStudent =
          trial.linkedStudentId &&
          students.find((student) => student.id === trial.linkedStudentId);

        const showNotInSchedule =
          trial.callStatus === 'agreed' &&
          Boolean(trial.linkedStudentId) &&
          !isStudentInSchedule(trial.linkedStudentId!, slots);

        return { trial, linkedStudent, showNotInSchedule };
      }),
    [trialLessons, students, slots],
  );

  const handleSubmit = async (input: TrialLessonFormInput) => {
    const editingId = editingTrial?.id ?? null;
    let linkedStudentId = input.linkedStudentId;
    const lastName = normalizeTrialLastName(input.lastName);

    if (input.callStatus === 'agreed') {
      const studentInput = {
        firstName: input.firstName,
        lastName,
        gradeClass: input.gradeClass,
        rate4Weeks: input.proposedRate4Weeks,
        lessonsPerWeek: input.proposedLessonsPerWeek,
        parentContacts: input.parentContacts,
      };

      const existing =
        (linkedStudentId &&
          students.find((student) => student.id === linkedStudentId)) ||
        findStudentByName(students, input.firstName, lastName);

      if (existing) {
        updateStudent(existing.id, studentInput);
        linkedStudentId = existing.id;
      } else {
        try {
          const created = await addStudent(studentInput);
          linkedStudentId = created.id;
        } catch (error) {
          console.error(
            '[trial-lessons] Failed to create linked student before trial update:',
            error,
          );
          return;
        }
      }
    }

    const payload: TrialLessonFormInput = {
      ...input,
      lastName,
      linkedStudentId,
    };

    if (editingId) {
      updateTrialLesson(editingId, payload);
      return;
    }

    addTrialLesson(payload);
  };

  const handleDelete = async () => {
    if (!deleteTarget || deletingId) return;
    setDeletingId(deleteTarget.id);
    setDeleteError(null);
    const result = await deleteTrialLesson(deleteTarget.id);
    setDeletingId(null);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
      >
        <GraduationCap className="h-4 w-4 text-[#6B93FF]" />
        <span>Пробные уроки</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-3 sm:p-4 md:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
            aria-label="Закрыть пробные уроки"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-trials-title"
            className="relative z-10 flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4 sm:px-6">
              <div>
                <h2
                  id="admin-trials-title"
                  className="text-xl font-semibold text-white"
                >
                  Пробные уроки
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {trialLessons.length} записей
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTrial(null);
                    setFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3166F0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2856d4]"
                >
                  <Plus className="h-4 w-4" />
                  Добавить пробный
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
              {rows.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
                  <GraduationCap className="mb-3 h-8 w-8 text-zinc-600" />
                  <p className="text-sm text-zinc-500">Пробных уроков пока нет</p>
                </div>
              ) : (
                <div className="overflow-auto rounded-2xl border border-zinc-800">
                  <table className="w-full min-w-[1400px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-3 font-medium">Имя</th>
                        <th className="px-3 py-3 font-medium">Фамилия</th>
                        <th className="px-3 py-3 font-medium">Дата</th>
                        <th className="px-3 py-3 font-medium">Класс</th>
                        <th className="px-3 py-3 font-medium">Цель</th>
                        <th className="px-3 py-3 font-medium">Результат</th>
                        <th className="px-3 py-3 font-medium">Ставка / 4 нед</th>
                        <th className="px-3 py-3 font-medium">В неделю</th>
                        <th className="px-3 py-3 font-medium">Контакты</th>
                        <th className="px-3 py-3 font-medium">Статус</th>
                        <th className="px-3 py-3 font-medium">Комментарий</th>
                        <th className="px-3 py-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ trial, showNotInSchedule }) => (
                        <tr
                          key={trial.id}
                          className="border-b border-zinc-800/80 align-top last:border-0 hover:bg-zinc-900/40"
                        >
                          <td className="px-3 py-3 font-medium text-white">
                            {trial.firstName}
                          </td>
                          <td className="px-3 py-3 text-zinc-300">
                            {trial.lastName}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-zinc-300">
                            {formatDateShort(trial.trialDate)}
                          </td>
                          <td className="px-3 py-3 text-zinc-300">
                            {trial.gradeClass}
                          </td>
                          <td className="max-w-[140px] px-3 py-3 text-zinc-300">
                            <ExpandableText text={trial.goal} />
                          </td>
                          <td className="max-w-[140px] px-3 py-3 text-zinc-300">
                            <ExpandableText text={trial.currentResult} />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-zinc-300">
                            {formatMoney(trial.proposedRate4Weeks)}
                          </td>
                          <td className="px-3 py-3 text-zinc-300">
                            {trial.proposedLessonsPerWeek}
                          </td>
                          <td className="max-w-[160px] px-3 py-3 text-zinc-300">
                            <ExpandableText text={trial.parentContacts} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1.5">
                              <CallStatusBadge status={trial.callStatus} />
                              {showNotInSchedule && (
                                <span className="inline-flex rounded-md border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-200">
                                  Не добавлен в расписание
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="max-w-[180px] px-3 py-3 text-zinc-400">
                            <ExpandableText text={trial.comment ?? '—'} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTrial(trial);
                                  setFormOpen(true);
                                }}
                                className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-[#3166F0]/50 hover:text-white"
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === trial.id}
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleteTarget(trial);
                                }}
                                className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-red-400 transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-60"
                              >
                                {deletingId === trial.id ? 'Удаление…' : 'Удалить'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <AdminTrialLessonFormModal
        open={formOpen}
        trial={editingTrial}
        onClose={() => {
          setFormOpen(false);
          setEditingTrial(null);
        }}
        onSubmit={(input) => {
          void handleSubmit(input);
        }}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!deletingId) setDeleteTarget(null);
            }}
            aria-label="Закрыть"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-white">Удалить пробное?</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {deleteTarget.firstName} {deleteTarget.lastName}
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Запись будет полностью удалена. Это действие нельзя отменить.
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-400">{deleteError}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deletingId) setDeleteTarget(null);
                }}
                disabled={Boolean(deletingId)}
                className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 transition hover:text-white disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={Boolean(deletingId)}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {deletingId ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CallStatusBadge({ status }: { status: TrialCallStatus }) {
  const styles: Record<TrialCallStatus, string> = {
    not_called: 'border-zinc-600 bg-zinc-800 text-zinc-300',
    agreed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    not_agreed: 'border-red-500/30 bg-red-500/10 text-red-300',
  };

  return (
    <span
      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${styles[status]}`}
    >
      {TRIAL_CALL_STATUS_LABELS[status]}
    </span>
  );
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 80;

  if (!isLong) {
    return <span className="text-xs leading-relaxed">{text}</span>;
  }

  return (
    <div>
      <p
        className={`text-xs leading-relaxed ${
          expanded ? '' : 'line-clamp-2'
        }`}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-1 text-[10px] text-[#6B93FF] hover:text-white"
      >
        {expanded ? 'Свернуть' : 'Развернуть'}
      </button>
    </div>
  );
}
