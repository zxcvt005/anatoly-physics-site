'use client';

import { useEffect, useState } from 'react';
import {
  readCookieConsent,
  writeCookieConsent,
} from '@/lib/legal/cookie-consent';
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = readCookieConsent();
    setVisible(!existing);
  }, []);

  if (!visible) {
    return null;
  }

  const handleAccept = () => {
    writeCookieConsent();
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-md sm:p-5"
      role="dialog"
      aria-live="polite"
      aria-label="Уведомление об использовании cookie"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
          Сайт использует cookie и аналогичные технологии для корректной работы
          и аналитики. Продолжая пользоваться сайтом, вы соглашаетесь с{' '}
          <a
            href={LEGAL_DOCUMENTS.privacy.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3166F0] underline underline-offset-2 hover:text-[#4d7ef5]"
          >
            Политикой обработки персональных данных
          </a>
          .
        </p>

        <button
          type="button"
          onClick={handleAccept}
          className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02]"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
