'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LEGAL_DOCUMENT_LIST } from '@/lib/legal/documents';

interface LegalDocumentsNavMenuProps {
  linkClass?: string;
  onNavigate?: () => void;
  variant?: 'desktop' | 'mobile';
}

export function LegalDocumentsNavMenu({
  linkClass = 'text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:text-white',
  onNavigate,
  variant = 'desktop',
}: LegalDocumentsNavMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    onNavigate?.();
  }, [onNavigate]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (variant === 'mobile') {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={`flex w-full items-center justify-between px-3 py-3 text-left ${linkClass}`}
        >
          <span>Документы</span>
          <span className="text-zinc-500" aria-hidden>
            {open ? '−' : '+'}
          </span>
        </button>

        {open ? (
          <div className="space-y-1 border-t border-zinc-800/80 px-2 py-2">
            {LEGAL_DOCUMENT_LIST.map((document) => (
              <a
                key={document.id}
                href={document.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="block rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
              >
                {document.title}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1.5 ${linkClass}`}
      >
        Документы
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-50 min-w-[20rem] rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl"
        >
          {LEGAL_DOCUMENT_LIST.map((document) => (
            <a
              key={document.id}
              href={document.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              {document.title}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
