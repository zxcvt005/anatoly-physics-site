import { Suspense } from 'react';
import { TestSessionLayoutClient } from '@/components/student-tests/TestSessionLayoutClient';

interface SessionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}

export default async function TestSessionLayout({
  children,
  params,
}: SessionLayoutProps) {
  const { token } = await params;

  return (
    <Suspense>
      <TestSessionLayoutClient token={token}>{children}</TestSessionLayoutClient>
    </Suspense>
  );
}
