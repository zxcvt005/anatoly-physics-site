'use client';

import { memo } from 'react';

type ContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ContactModal = memo(function ContactModal({
  isOpen,
  onClose,
}: ContactModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Записаться</h2>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-zinc-400 transition hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <a
            href="https://t.me/Tobilk1011"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl bg-white px-6 py-4 text-center text-lg font-semibold text-black transition hover:scale-[1.02]"
          >
            Telegram — @Tobilk1011
          </a>

          <a
            href="https://vk.ru/anatolyphys"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-center text-lg font-semibold text-white transition hover:scale-[1.02]"
          >
            ВКонтакте
          </a>

          <a
            href="tel:+79000658503"
            className="block rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-center text-lg font-semibold text-white transition hover:scale-[1.02]"
          >
            +7 900 065-85-03
          </a>
        </div>
      </div>
    </div>
  );
});
