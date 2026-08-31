'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { computeRatePerLesson } from '@/lib/student-utils';
import { formatMoney } from '@/lib/tutor-calculations';
import type {
  DeleteStudentResult,
  StudentFormInput,
} from '@/providers/StudentsProvider';
import type { Student, StudentActivityStatus } from '@/types/tutor';

interface AdminStudentFormModalProps {
  open: boolean;
  student?: Student | null;
  onClose: () => void;
  onSubmit: (input: StudentFormInput) => void;
  onDelete?: (studentId: string) => Promise<DeleteStudentResult>;
}

export function AdminStudentFormModal({
  open,
  student,
  onClose,
  onSubmit,
  onDelete,
}: AdminStudentFormModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gradeClass, setGradeClass] = useState('');
  const [rate4Weeks, setRate4Weeks] = useState('');
  const [lessonsPerWeek, setLessonsPerWeek] = useState('');
  const [parentContacts, setParentContacts] = useState('');
  const [activityStatus, setActivityStatus] =
    useState<StudentActivityStatus>('active');
  const [pauseComment, setPauseComment] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEdit = Boolean(student);

  useEffect(() => {
    if (!open) return;

    setFirstName(student?.firstName ?? '');
    setLastName(student?.lastName ?? '');
    setGradeClass(student?.gradeClass ?? '');
    setRate4Weeks(student ? String(student.rate4Weeks) : '');
    setLessonsPerWeek(student ? String(student.lessonsPerWeek) : '2');
    setParentContacts(student?.parentContacts ?? '');
    setActivityStatus(student?.activityStatus ?? 'active');
    setPauseComment(student?.pauseComment ?? '');
    setDeleteConfirmOpen(false);
    setDeleteError(null);
    setIsDeleting(false);
  }, [open, student]);

  const parsedRate4Weeks = Number(rate4Weeks.replace(/\s/g, ''));
  const parsedLessonsPerWeek = Number(lessonsPerWeek);
  const computedLessonRate = useMemo(() => {
    if (!parsedRate4Weeks || !parsedLessonsPerWeek) return 0;
    return computeRatePerLesson(parsedRate4Weeks, parsedLessonsPerWeek);
  }, [parsedRate4Weeks, parsedLessonsPerWeek]);

  if (!open) return null;

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    gradeClass.trim() &&
    parsedRate4Weeks > 0 &&
    parsedLessonsPerWeek > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gradeClass: gradeClass.trim(),
      rate4Weeks: parsedRate4Weeks,
      lessonsPerWeek: parsedLessonsPerWeek,
      parentContacts: parentContacts.trim() || undefined,
      activityStatus,
      pauseComment:
        activityStatus === 'paused' ? pauseComment.trim() || undefined : undefined,
    });
    onClose();
  };

  const handleDeleteConfirm = async () => {
    if (!student || !onDelete || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    const result = await onDelete(student.id);

    if (result.ok) {
      setDeleteConfirmOpen(false);
      onClose();
      return;
    }

    setDeleteError(result.error);
    setDeleteConfirmOpen(false);
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-form-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 id="student-form-title" className="text-lg font-semibold text-white">
            {isEdit ? 'Редактировать ученика' : 'Добавить ученика'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="student-first-name"
              label="Имя"
              value={firstName}
              onChange={setFirstName}
              required
            />
            <Field
              id="student-last-name"
              label="Фамилия"
              value={lastName}
              onChange={setLastName}
              required
            />
          </div>

          <Field
            id="student-grade"
            label="Класс"
            value={gradeClass}
            onChange={setGradeClass}
            placeholder="11"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="student-rate-4w"
              label="Ставка за 4 недели, ₽"
              value={rate4Weeks}
              onChange={(value) => setRate4Weeks(value.replace(/\D/g, ''))}
              inputMode="numeric"
              required
            />
            <Field
              id="student-lessons-week"
              label="Занятий в неделю"
              value={lessonsPerWeek}
              onChange={(value) => setLessonsPerWeek(value.replace(/\D/g, ''))}
              inputMode="numeric"
              required
            />
          </div>

          {computedLessonRate > 0 && (
            <p className="rounded-xl border border-[#3166F0]/30 bg-[#3166F0]/10 px-3.5 py-2.5 text-sm text-[#6B93FF]">
              Расчёт 1 занятия: {formatMoney(computedLessonRate)}
            </p>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-300">
              Статус ученика
            </legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="student-activity-status"
                  checked={activityStatus === 'active'}
                  onChange={() => setActivityStatus('active')}
                  className="h-4 w-4 accent-[#3166F0]"
                />
                Активный
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  name="student-activity-status"
                  checked={activityStatus === 'paused'}
                  onChange={() => setActivityStatus('paused')}
                  className="h-4 w-4 accent-[#3166F0]"
                />
                Пауза
              </label>
            </div>
          </fieldset>

          {activityStatus === 'paused' && (
            <div>
              <label
                htmlFor="student-pause-comment"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Комментарий к паузе
              </label>
              <input
                id="student-pause-comment"
                type="text"
                value={pauseComment}
                onChange={(event) => setPauseComment(event.target.value)}
                placeholder="Например: уехал, болеет, каникулы"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="student-parent-contacts"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Контакты родителей
            </label>
            <textarea
              id="student-parent-contacts"
              value={parentContacts}
              onChange={(event) => setParentContacts(event.target.value)}
              placeholder="Телефон, Telegram, e-mail…"
              rows={2}
              className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-[#3166F0] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2856d4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isEdit ? 'Сохранить' : 'Добавить'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              Отмена
            </button>
          </div>

          {isEdit && onDelete && (
            <div className="mt-6 border-t border-zinc-800 pt-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Опасная зона
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteConfirmOpen(true);
                }}
                className="rounded-xl border border-red-900/60 bg-red-950/40 px-5 py-2.5 text-sm font-medium text-red-400 transition hover:border-red-700 hover:bg-red-950/60 hover:text-red-300"
              >
                Удалить ученика
              </button>
              {deleteError && (
                <p className="mt-3 text-sm text-red-400" role="alert">
                  {deleteError}
                </p>
              )}
            </div>
          )}
        </form>
      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!isDeleting) setDeleteConfirmOpen(false);
            }}
            aria-label="Закрыть"
          />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="student-delete-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
          >
            <h3 id="student-delete-title" className="text-lg font-semibold text-white">
              Удалить ученика и всю связанную историю?
            </h3>
            <p className="mt-3 text-sm text-zinc-400">
              Будут безвозвратно удалены занятия, оплаты, тесты, расписание и
              другие данные этого ученика. Это действие необратимо.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? 'Удаление…' : 'Да, удалить навсегда'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: 'numeric' | 'text';
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
      />
    </div>
  );
}
