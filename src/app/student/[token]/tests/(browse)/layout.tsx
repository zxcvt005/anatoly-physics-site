import { TestsSectionLayout } from '@/components/student-tests/TestsSectionLayout';

interface BrowseLayoutProps {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}

export default async function TestsBrowseLayout({
  children,
  params,
}: BrowseLayoutProps) {
  const { token } = await params;

  return <TestsSectionLayout token={token}>{children}</TestsSectionLayout>;
}
