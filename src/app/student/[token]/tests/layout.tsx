import type { Metadata } from 'next';
import { TestsDataProvider } from '@/components/student-tests/TestsDataProvider';

interface TestsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Тесты — Личный кабинет',
    robots: { index: false, follow: false },
  };
}

export default async function TestsLayout({ children, params }: TestsLayoutProps) {
  const { token } = await params;

  return <TestsDataProvider token={token}>{children}</TestsDataProvider>;
}
