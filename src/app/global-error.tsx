'use client';

import { useEffect } from 'react';
import { reportClientBoundaryError } from '@/lib/diagnostics/client/init';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientBoundaryError('app/global-error-boundary', error, {
      operation: 'app/global-error-boundary',
      errorMessage: error.digest
        ? `${error.message} (digest: ${error.digest})`
        : error.message,
    });
  }, [error]);

  return (
    <html lang="ru">
      <body className="min-h-screen bg-black text-white antialiased">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-3xl border border-red-900/50 bg-red-950/20 px-6 py-8 text-center">
            <h1 className="mb-3 text-2xl font-bold text-red-200">
              Критическая ошибка
            </h1>
            <p className="mb-6 text-zinc-400">
              Приложение не смогло продолжить работу. Обновите страницу.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Обновить страницу
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
