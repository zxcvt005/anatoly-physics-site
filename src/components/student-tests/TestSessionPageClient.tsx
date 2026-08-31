'use client';

import Link from 'next/link';
import { TestSessionView } from '@/components/student-tests/TestSessionView';
import { testsHomePath } from '@/lib/tests/student-navigation';

type TestSessionPageClientProps = {
  token: string;
  testId: string;
  title: string;
  source: 'lesson' | 'self';
  attemptId?: string;
  assignmentId?: string;
  viewResult?: boolean;
};

export function TestSessionPageClient({
  token,
  testId,
  title,
  source,
  attemptId,
  assignmentId,
  viewResult,
}: TestSessionPageClientProps) {
  if (!testId) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-center">
        <p className="text-sm text-zinc-400">Тест не найден</p>
        <Link
          href={testsHomePath(token)}
          className="mt-4 inline-block text-sm font-semibold text-[#3166F0] hover:underline"
        >
          Вернуться к тестам
        </Link>
      </div>
    );
  }

  return (
    <TestSessionView
      token={token}
      testId={testId}
      title={title}
      source={source}
      attemptId={attemptId}
      assignmentId={assignmentId}
      viewResult={viewResult}
    />
  );
}
