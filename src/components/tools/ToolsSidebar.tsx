'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import {
  isExactNavItemActive,
  shouldExpandNavItem,
  toolsNavigation,
  type ToolsNavItem,
} from '@/lib/tools/navigation';

type ToolsSidebarProps = {
  isMobileOpen: boolean;
  onMobileClose: () => void;
};

function SidebarNavItem({
  item,
  pathname,
  depth = 0,
  onNavigate,
}: {
  item: ToolsNavItem;
  pathname: string;
  depth?: number;
  onNavigate?: () => void;
}) {
  const hasChildren = Boolean(item.children?.length);
  const isActive = isExactNavItemActive(item.path, pathname);
  const pathRequiresExpand = shouldExpandNavItem(item, pathname);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  useEffect(() => {
    setManualExpanded(null);
  }, [pathname]);

  const isExpanded = manualExpanded ?? pathRequiresExpand;

  const linkClass = [
    'block rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200',
    depth > 0 ? 'pl-5' : '',
    isActive
      ? 'border-l-2 border-[#3166F0] bg-[#3166F0]/10 text-[#3166F0]'
      : 'border-l-2 border-transparent text-zinc-400 hover:bg-zinc-900/80 hover:text-white',
  ].join(' ');

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <Link
          href={item.path}
          onClick={onNavigate}
          className={`${linkClass} min-w-0 flex-1`}
          aria-current={isActive ? 'page' : undefined}
        >
          {item.title}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setManualExpanded(!isExpanded)}
            className="mr-1 rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Свернуть раздел' : 'Развернуть раздел'}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-zinc-800 pl-1">
          {item.children!.map((child) => (
            <SidebarNavItem
              key={child.id}
              item={child}
              pathname={pathname}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1" aria-label="Разделы инструментов">
      {toolsNavigation.map((item) => (
        <SidebarNavItem
          key={item.id}
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

export function ToolsSidebar({ isMobileOpen, onMobileClose }: ToolsSidebarProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const handleNavigate = useCallback(() => {
    onMobileClose();
  }, [onMobileClose]);

  const mobileDrawer =
    isMobileOpen &&
    isMounted &&
    createPortal(
      <div className="fixed inset-0 z-50 lg:hidden">
        <button
          type="button"
          onClick={onMobileClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          aria-label="Закрыть меню разделов"
        />
        <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Разделы
            </p>
            <button
              type="button"
              onClick={onMobileClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:text-white"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <SidebarContent pathname={pathname} onNavigate={handleNavigate} />
          </div>
        </aside>
      </div>,
      document.body,
    );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 backdrop-blur-sm">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Разделы
          </p>
          <SidebarContent pathname={pathname} />
        </div>
      </aside>
      {mobileDrawer}
    </>
  );
}

export function ToolsSidebarToggle({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white lg:hidden"
      aria-label="Открыть разделы"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M2 4H14M2 8H14M2 12H10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      Разделы
    </button>
  );
}
