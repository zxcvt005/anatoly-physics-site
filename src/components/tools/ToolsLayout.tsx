'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

function LibraryEdgeHandle({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? 'Развернуть библиотеку' : 'Свернуть библиотеку'}
      className={[
        'group absolute top-1/2 z-30 flex h-14 w-5 -translate-y-1/2 items-center justify-center',
        'border border-zinc-700/90 bg-zinc-950/90 text-zinc-400 backdrop-blur-sm',
        'shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200',
        'hover:border-[#3166F0]/50 hover:bg-[#3166F0]/15 hover:text-white',
        collapsed
          ? 'left-0 rounded-r-xl rounded-l-none border-l-0'
          : 'right-0 translate-x-1/2 rounded-xl',
      ].join(' ')}
    >
      {collapsed ? (
        <ChevronRight className="h-3.5 w-3.5 relative z-10" aria-hidden />
      ) : (
        <ChevronLeft className="h-3.5 w-3.5 relative z-10" aria-hidden />
      )}
    </button>
  );
}

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
      <div className="relative text-white max-lg:min-h-screen lg:h-dvh lg:overflow-hidden">
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

        <div className="relative z-10 flex max-lg:min-h-screen max-lg:flex-col lg:h-full lg:flex-col lg:overflow-hidden">
          <div className="shrink-0">
            <ToolsHeader />
          </div>

          <div
            className={`mx-auto flex w-full min-h-0 flex-1 gap-4 px-4 py-3 sm:px-6 lg:gap-4 lg:overflow-hidden lg:py-3 ${
              isLibraryCollapsed ? 'max-w-none' : 'max-w-7xl'
            }`}
          >
            <div
              className={`relative shrink-0 overflow-visible transition-[width,opacity] duration-200 ${
                isLibraryCollapsed
                  ? 'pointer-events-none w-0 opacity-0 max-lg:hidden'
                  : 'w-64 max-lg:w-0'
              }`}
            >
              <ToolsSidebar
                isMobileOpen={isMobileSidebarOpen}
                onMobileClose={() => setIsMobileSidebarOpen(false)}
                hideDesktop={isLibraryCollapsed}
              />
              {!isLibraryCollapsed && (
                <div className="pointer-events-none absolute inset-y-0 right-0 hidden lg:block">
                  <div className="pointer-events-auto relative h-full">
                    <LibraryEdgeHandle
                      collapsed={false}
                      onClick={() => setCollapsed(true)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">
              <div className="mb-4 shrink-0 lg:hidden">
                <ToolsSidebarToggle onClick={() => setIsMobileSidebarOpen(true)} />
              </div>
              {isLibraryCollapsed && (
                <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden lg:block">
                  <div className="pointer-events-auto relative h-full">
                    <LibraryEdgeHandle
                      collapsed
                      onClick={() => setCollapsed(false)}
                    />
                  </div>
                </div>
              )}
              <div className="relative min-h-0 flex-1 animate-[fade-in_0.4s_ease-out] max-lg:overflow-visible lg:overflow-y-auto lg:overscroll-contain">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolsWorkspaceContext.Provider>
  );
}
