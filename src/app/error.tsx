'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { reportClientBoundaryError } from '@/lib/diagnostics/client/init';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientBoundaryError('app/error-boundary', error, {
      operation: 'app/error-boundary',
      errorMessage: error.digest
        ? `${error.message} (digest: ${error.digest})`
        : error.message,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-red-900/50 bg-red-950/20 px-6 py-8 text-center">
        <h1 className="mb-3 text-2xl font-bold text-red-200">
          Не удалось загрузить страницу
        </h1>
        <p className="mb-6 text-zinc-400">
          Произошла ошибка приложения. Попробуйте обновить страницу.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="rounded-2xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500"
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}
