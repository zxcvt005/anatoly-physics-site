'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TRIAL_CALL_STATUS_LABELS } from '@/lib/trial-lesson-utils';
import type { TrialLessonFormInput } from '@/providers/TrialLessonsProvider';
import type { TrialCallStatus, TrialLesson } from '@/types/tutor';

interface AdminTrialLessonFormModalProps {
  open: boolean;
  trial?: TrialLesson | null;
  onClose: () => void;
  onSubmit: (input: TrialLessonFormInput) => void;
}

const CALL_STATUS_OPTIONS: TrialCallStatus[] = [
  'not_called',
  'agreed',
  'not_agreed',
];

export function AdminTrialLessonFormModal({
  open,
  trial,
  onClose,
  onSubmit,
}: AdminTrialLessonFormModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [gradeClass, setGradeClass] = useState('');
  const [goal, setGoal] = useState('');
  const [currentResult, setCurrentResult] = useState('');
  const [proposedRate4Weeks, setProposedRate4Weeks] = useState('');
  const [proposedLessonsPerWeek, setProposedLessonsPerWeek] = useState('2');
  const [parentContacts, setParentContacts] = useState('');
  const [comment, setComment] = useState('');
  const [callStatus, setCallStatus] = useState<TrialCallStatus>('not_called');

  const isEdit = Boolean(trial);

  useEffect(() => {
    if (!open) return;

    setFirstName(trial?.firstName ?? '');
    setLastName(trial?.lastName ?? '');
    setTrialDate(trial?.trialDate ?? new Date().toISOString().slice(0, 10));
    setGradeClass(trial?.gradeClass ?? '');
    setGoal(trial?.goal ?? '');
    setCurrentResult(trial?.currentResult ?? '');
    setProposedRate4Weeks(trial ? String(trial.proposedRate4Weeks) : '');
    setProposedLessonsPerWeek(
      trial ? String(trial.proposedLessonsPerWeek) : '2',
    );
    setParentContacts(trial?.parentContacts ?? '');
    setComment(trial?.comment ?? '');
    setCallStatus(trial?.callStatus ?? 'not_called');
  }, [open, trial]);

  if (!open) return null;

  const parsedRate = Number(proposedRate4Weeks.replace(/\s/g, ''));
  const parsedLessons = Number(proposedLessonsPerWeek);

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    trialDate &&
    gradeClass.trim() &&
    goal.trim() &&
    currentResult.trim() &&
    parsedRate > 0 &&
    parsedLessons > 0 &&
    parentContacts.trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      trialDate,
      gradeClass: gradeClass.trim(),
      goal: goal.trim(),
      currentResult: currentResult.trim(),
      proposedRate4Weeks: parsedRate,
      proposedLessonsPerWeek: parsedLessons,
      parentContacts: parentContacts.trim(),
      comment: comment.trim() || undefined,
      callStatus: isEdit ? callStatus : 'not_called',
      linkedStudentId: trial?.linkedStudentId,
    });
    onClose();
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
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? 'Редактировать пробный' : 'Добавить пробный'}
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
            <Field label="Имя" value={firstName} onChange={setFirstName} required />
            <Field
              label="Фамилия"
              value={lastName}
              onChange={setLastName}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Дата пробного
              </label>
              <input
                type="date"
                value={trialDate}
                onChange={(e) => setTrialDate(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
              />
            </div>
            <Field
              label="Класс"
              value={gradeClass}
              onChange={setGradeClass}
              required
            />
          </div>

          <Field label="Цель" value={goal} onChange={setGoal} required />
          <Field
            label="Текущий результат"
            value={currentResult}
            onChange={setCurrentResult}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Ставка за 4 недели, ₽"
              value={proposedRate4Weeks}
              onChange={(v) => setProposedRate4Weeks(v.replace(/\D/g, ''))}
              inputMode="numeric"
              required
            />
            <Field
              label="Занятий в неделю"
              value={proposedLessonsPerWeek}
              onChange={(v) => setProposedLessonsPerWeek(v.replace(/\D/g, ''))}
              inputMode="numeric"
              required
            />
          </div>

          <TextArea
            label="Контакты родителей"
            value={parentContacts}
            onChange={setParentContacts}
            required
          />
          <TextArea
            label="Комментарий"
            value={comment}
            onChange={setComment}
            placeholder="Почему договорились / не договорились, что обсудили…"
          />

          {isEdit && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-zinc-300">
                Статус созвона / договора
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {CALL_STATUS_OPTIONS.map((status) => (
                  <label
                    key={status}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                      callStatus === status
                        ? 'border-[#3166F0]/50 bg-[#3166F0]/10 text-white'
                        : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="call-status"
                      value={status}
                      checked={callStatus === status}
                      onChange={() => setCallStatus(status)}
                      className="accent-[#3166F0]"
                    />
                    {TRIAL_CALL_STATUS_LABELS[status]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

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
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: 'numeric' | 'text';
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        inputMode={inputMode}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
      />
    </div>
  );
}
