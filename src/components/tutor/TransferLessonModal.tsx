'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { TransferLessonInput } from '@/types/tutor';

interface TransferLessonModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: TransferLessonInput) => void;
  title?: string;
}

export function TransferLessonModal({
  open,
  onClose,
  onSubmit,
  title = 'Перенести занятие',
}: TransferLessonModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('17:00');
  const [endTime, setEndTime] = useState('18:00');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().slice(0, 10);
    setDate(today);
    setTime('17:00');
    setEndTime('18:00');
    setComment('');
  }, [open]);

  if (!open) return null;

  const canSubmit = Boolean(date && time && endTime && endTime > time);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      date,
      time,
      endTime,
      comment: comment.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-lesson-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 id="transfer-lesson-title" className="text-lg font-semibold text-white">
            {title}
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
          <Field label="Новая дата">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              className={inputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Время начала">
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Время окончания">
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
                min={time}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Комментарий">
            <input
              type="text"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Необязательно"
              className={inputClass}
            />
          </Field>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-[#3166F0] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2856d4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Перенести
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

const inputClass =
  'w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  );
}
