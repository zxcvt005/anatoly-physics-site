'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CrmAccessRole } from '@/lib/auth/crm-access/constants';

function resolveLoginRole(nextPath: string): CrmAccessRole {
  return nextPath.startsWith('/assistant') ? 'assistant' : 'admin';
}

const LOGIN_COPY: Record<
  CrmAccessRole,
  { title: string; description: string }
> = {
  admin: {
    title: 'Вход в админку',
    description: 'Введите пароль администратора',
  },
  assistant: {
    title: 'Вход для ассистента',
    description: 'Введите пароль ассистентки',
  },
};

export function CrmLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get('next') || '/admin';
  const role = useMemo(() => resolveLoginRole(nextPath), [nextPath]);
  const copy = LOGIN_COPY[role];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/crm-login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, role }),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !body.ok) {
        setError(body.error ?? 'Не удалось войти');
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('Не удалось войти. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(49,102,240,0.12)_0%,_transparent_60%)]"
        aria-hidden
      />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/90 p-8 shadow-2xl shadow-[#3166F0]/10">
          <h1 className="text-center text-2xl font-bold text-white">
            {copy.title}
          </h1>
          <p className="mt-2 text-center text-sm text-zinc-400">
            {copy.description}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="crm-password"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Пароль
              </label>
              <input
                id="crm-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-[#3166F0] focus:ring-2 focus:ring-[#3166F0]/30"
                placeholder="Введите пароль"
                required
              />
            </div>

            {error && (
              <p
                className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#3166F0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2857d8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Вход…' : 'Войти'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
