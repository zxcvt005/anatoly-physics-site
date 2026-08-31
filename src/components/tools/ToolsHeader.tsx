'use client';

import Image from 'next/image';
import Link from 'next/link';

const navLinkClass =
  'rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200';

export function ToolsHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/tools"
          className="flex items-center gap-3 text-sm font-semibold tracking-wide text-white transition hover:text-[#3166F0] sm:gap-4 sm:text-base"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white sm:h-10 sm:w-10">
            <Image
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              className="h-7 w-auto sm:h-8"
            />
          </span>
          <span className="hidden sm:inline">
            Анатолий <span className="text-zinc-500">|</span> Физика ЕГЭ
          </span>
          <span className="sm:hidden">Физика ЕГЭ</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Навигация инструментов">
          <Link
            href="/"
            className={`${navLinkClass} text-zinc-300 hover:bg-zinc-900/80 hover:text-white`}
          >
            Главная
          </Link>
          <Link
            href="/tools"
            className={`${navLinkClass} bg-[#3166F0]/15 text-[#3166F0]`}
            aria-current="page"
          >
            Инструменты
          </Link>
        </nav>
      </div>
    </header>
  );
}
