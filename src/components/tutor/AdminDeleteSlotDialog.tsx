'use client';

import { formatTimeRange, WEEKDAY_LABELS } from '@/lib/tutor-calculations';
import type { WeeklyScheduleSlot } from '@/types/tutor';

interface AdminDeleteSlotDialogProps {
  open: boolean;
  slot: WeeklyScheduleSlot | null;
  studentNames: string[];
  onClose: () => void;
  onConfirm: () => void;
}

export function AdminDeleteSlotDialog({
  open,
  slot,
  studentNames,
  onClose,
  onConfirm,
}: AdminDeleteSlotDialogProps) {
  if (!open || !slot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        <h2 className="text-lg font-semibold text-white">Удалить слот?</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {WEEKDAY_LABELS[slot.weekday]},{' '}
          {formatTimeRange(slot.startTime, slot.endTime)}
        </p>
        {studentNames.length > 0 && (
          <p className="mt-1 text-sm text-zinc-500">
            Ученики: {studentNames.join(', ')}
          </p>
        )}
        <p className="mt-3 text-sm text-zinc-500">
          Слот будет удалён из расписания. Это действие нельзя отменить.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
          >
            Удалить
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
