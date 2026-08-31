'use client';

import { useState } from 'react';
import { TestsHeader } from '@/components/student-tests/TestsHeader';
import { TestsDataProvider } from '@/components/student-tests/TestsDataProvider';
import { TestsSidebar, TestsSidebarToggle } from '@/components/student-tests/TestsSidebar';

type TestsSectionLayoutProps = {
  token: string;
  children: React.ReactNode;
};

function TestsSectionShell({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 bg-black" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-32 top-0 h-96 w-96 rounded-full bg-[#3166F0]/8 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <TestsHeader token={token} />

        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8">
          <TestsSidebar
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={() => setIsMobileSidebarOpen(false)}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-6 lg:hidden">
              <TestsSidebarToggle onClick={() => setIsMobileSidebarOpen(true)} />
            </div>
            <div className="animate-[fade-in_0.4s_ease-out]">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestsSectionLayout({ token, children }: TestsSectionLayoutProps) {
  return <TestsSectionShell token={token}>{children}</TestsSectionShell>;
}

export function TestsSectionLayoutWithProvider({
  token,
  children,
}: TestsSectionLayoutProps) {
  return (
    <TestsDataProvider token={token}>
      <TestsSectionShell token={token}>{children}</TestsSectionShell>
    </TestsDataProvider>
  );
}
