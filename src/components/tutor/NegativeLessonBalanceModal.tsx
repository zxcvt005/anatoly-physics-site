'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface NegativeLessonBalanceModalProps {
  open: boolean;
  deficitLessons: number;
  onDismiss: () => void;
}

export function NegativeLessonBalanceModal({
  open,
  deficitLessons,
  onDismiss,
}: NegativeLessonBalanceModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-x-hidden p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="negative-lesson-balance-title"
        aria-describedby="negative-lesson-balance-text"
        className="relative z-10 w-full max-w-md overflow-x-hidden rounded-3xl border border-amber-500/30 bg-zinc-950 p-6 shadow-[0_0_48px_rgba(0,0,0,0.45)]"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-amber-300/80">
          Баланс занятий
        </p>
        <h2
          id="negative-lesson-balance-title"
          className="mt-2 text-xl font-semibold text-white"
        >
          Занятия ушли в минус
        </h2>
        <div
          id="negative-lesson-balance-text"
          className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-300"
        >
          <p>Сейчас у вас баланс — {deficitLessons} часов.</p>
          <p>
            Проверьте, пожалуйста, не забыли ли вы внести оплату за занятия.
          </p>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onDismiss}
          className="mt-6 flex w-full items-center justify-center rounded-2xl bg-[#3166F0] px-6 py-3.5 text-base font-semibold text-white shadow-[0_0_32px_rgba(49,102,240,0.35)] transition hover:bg-[#2858d4]"
        >
          Понятно
        </button>
      </div>
    </div>,
    document.body,
  );
}
