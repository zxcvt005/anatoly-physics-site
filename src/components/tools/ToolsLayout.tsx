'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { ToolsHeader } from '@/components/tools/ToolsHeader';
import { ToolsSidebar, ToolsSidebarToggle } from '@/components/tools/ToolsSidebar';

const LIBRARY_COLLAPSED_KEY = 'tools-library-collapsed';

type ToolsWorkspaceValue = {
  isLibraryCollapsed: boolean;
};

const ToolsWorkspaceContext = createContext<ToolsWorkspaceValue>({
  isLibraryCollapsed: false,
});

export function useToolsWorkspace(): ToolsWorkspaceValue {
  return useContext(ToolsWorkspaceContext);
}

type ToolsLayoutProps = {
  children: React.ReactNode;
};

export function ToolsLayout({ children }: ToolsLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);

  useEffect(() => {
    try {
      setIsLibraryCollapsed(window.localStorage.getItem(LIBRARY_COLLAPSED_KEY) === '1');
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  const setCollapsed = (collapsed: boolean) => {
    setIsLibraryCollapsed(collapsed);
    try {
      window.localStorage.setItem(LIBRARY_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // Ignore storage access errors.
    }
  };

  return (
    <ToolsWorkspaceContext.Provider value={{ isLibraryCollapsed }}>
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
          <ToolsHeader />

          <div
            className={`mx-auto flex w-full flex-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8 ${
              isLibraryCollapsed ? 'max-w-none' : 'max-w-7xl'
            }`}
          >
            {!isLibraryCollapsed && (
              <ToolsSidebar
                isMobileOpen={isMobileSidebarOpen}
                onMobileClose={() => setIsMobileSidebarOpen(false)}
                onDesktopCollapse={() => setCollapsed(true)}
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-6 lg:hidden">
                <ToolsSidebarToggle onClick={() => setIsMobileSidebarOpen(true)} />
              </div>
              {isLibraryCollapsed && (
                <div className="mb-6 hidden lg:block">
                  <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#3166F0]/40 bg-[#3166F0]/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3166F0]/25"
                  >
                    <PanelLeftOpen className="h-4 w-4" aria-hidden />
                    Развернуть библиотеку
                  </button>
                </div>
              )}
              <div className="animate-[fade-in_0.4s_ease-out]">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </ToolsWorkspaceContext.Provider>
  );
}

