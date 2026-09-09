'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { MockExam } from '@/lib/mock-exams/types';

type MockExamFormModalProps = {
  open: boolean;
  exam?: MockExam | null;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    examDate: string;
    maxScore: number;
  }) => Promise<boolean> | boolean;
};

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function MockExamFormModal({
  open,
  exam,
  onClose,
  onSubmit,
}: MockExamFormModalProps) {
  const [title, setTitle] = useState('');
  const [examDate, setExamDate] = useState(todayDateInputValue());
  const [maxScore, setMaxScore] = useState('45');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEdit = Boolean(exam);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(exam?.title ?? '');
    setExamDate(exam?.examDate ?? todayDateInputValue());
    setMaxScore(exam ? String(exam.maxScore) : '45');
    setError(null);
    setIsSaving(false);
  }, [open, exam]);

  if (!open) {
    return null;
  }

  const parsedMax = Number.parseInt(maxScore, 10);
  const canSubmit =
    title.trim().length > 0 &&
    examDate.length > 0 &&
    Number.isInteger(parsedMax) &&
    parsedMax > 0 &&
    !isSaving;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setError(null);
    const ok = await onSubmit({
      title: title.trim(),
      examDate,
      maxScore: parsedMax,
    });
    setIsSaving(false);

    if (!ok) {
      setError('Не удалось сохранить пробник. Проверьте данные и попробуйте снова.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? 'Редактировать пробник' : 'Добавить пробник'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label
              htmlFor="mock-exam-title"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Название
            </label>
            <input
              id="mock-exam-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Пробник №1"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>

          <div>
            <label
              htmlFor="mock-exam-date"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Дата проведения
            </label>
            <input
              id="mock-exam-date"
              type="date"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>

          <div>
            <label
              htmlFor="mock-exam-max"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            >
              Максимальный балл
            </label>
            <input
              id="mock-exam-max"
              type="number"
              min={1}
              step={1}
              value={maxScore}
              onChange={(event) => setMaxScore(event.target.value)}
              className="no-spinner w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-[#3166F0] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2856d4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
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
