'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { testsHomePath } from '@/lib/tests/student-navigation';

export function TestSessionLayoutClient({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const title = searchParams.get('title') ?? 'Тест';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <Link
          href={testsHomePath(token)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-sm text-zinc-300 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{title}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </div>
  );
}
