'use client';

import { useState } from 'react';
import { LEGAL_DOCUMENT_LIST } from '@/lib/legal/documents';

export function LegalDocumentsCompactPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-white">Документы</span>
        <span className="text-sm text-zinc-500" aria-hidden>
          {open ? 'Свернуть' : 'Открыть'}
        </span>
      </button>

      {open ? (
        <div className="space-y-1 border-t border-zinc-800 px-3 py-3">
          {LEGAL_DOCUMENT_LIST.map((document) => (
            <a
              key={document.id}
              href={document.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              {document.title}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
