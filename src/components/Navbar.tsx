'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { LegalDocumentsNavMenu } from '@/components/legal/LegalDocumentsNavMenu';

const EASTER_EGG_GOAL = 6;
const EASTER_EGG_IMAGE = '/joke1.png';

const navLinks = [
  { label: 'Главная', href: '#home' },
  { label: 'Обо мне', href: '#about' },
  { label: 'Летняя школа', href: '#summer-school' },
  { label: 'Преимущества', href: '#benefits' },
  { label: 'Пробный урок', href: '#trial' },
  { label: 'Для родителей', href: '#parents' },
];

const sectionIds = navLinks.map((link) => link.href.slice(1));

export function Navbar() {
  const activeId = useScrollSpy(sectionIds);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [easterClickCount, setEasterClickCount] = useState(0);
  const [showEasterProgress, setShowEasterProgress] = useState(false);
  const [isEasterModalOpen, setIsEasterModalOpen] = useState(false);
  const hideEasterProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      isMobileMenuOpen || isEasterModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, isEasterModalOpen]);

  useEffect(() => {
    return () => {
      if (hideEasterProgressTimerRef.current) {
        clearTimeout(hideEasterProgressTimerRef.current);
      }
    };
  }, []);

  const handleNavClick = useCallback((href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(href.slice(1));
    element?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scheduleHideEasterProgress = useCallback(() => {
    if (hideEasterProgressTimerRef.current) {
      clearTimeout(hideEasterProgressTimerRef.current);
    }

    hideEasterProgressTimerRef.current = setTimeout(() => {
      setShowEasterProgress(false);
    }, 2000);
  }, []);

  const closeEasterModal = useCallback(() => {
    setIsEasterModalOpen(false);
    setEasterClickCount(0);
    setShowEasterProgress(false);

    if (hideEasterProgressTimerRef.current) {
      clearTimeout(hideEasterProgressTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isEasterModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEasterModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEasterModalOpen, closeEasterModal]);

  const handleLogoClick = useCallback(() => {
    handleNavClick('#home');

    setEasterClickCount((prev) => {
      const next = prev + 1;

      if (next >= EASTER_EGG_GOAL) {
        setIsEasterModalOpen(true);
        setShowEasterProgress(false);

        if (hideEasterProgressTimerRef.current) {
          clearTimeout(hideEasterProgressTimerRef.current);
        }

        return EASTER_EGG_GOAL;
      }

      if (next >= 3) {
        setShowEasterProgress(true);
        scheduleHideEasterProgress();
      }

      return next;
    });
  }, [handleNavClick, scheduleHideEasterProgress]);

  const linkClass = useCallback(
    (href: string) => {
      const isActive = activeId === href.slice(1);
      return [
        'text-sm font-semibold transition-colors duration-200',
        isActive ? 'text-[#3166F0]' : 'text-zinc-300 hover:text-white',
      ].join(' ');
    },
    [activeId],
  );

  const easterLightbox =
    isEasterModalOpen &&
    isMounted &&
    createPortal(
      <div
        onClick={closeEasterModal}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Пасхалка"
      >
        <button
          type="button"
          onClick={closeEasterModal}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/90 text-2xl text-zinc-300 transition hover:text-white"
          aria-label="Закрыть"
        >
          ×
        </button>

        <div
          onClick={(event) => event.stopPropagation()}
          className="relative max-h-[85vh] max-w-[90vw]"
        >
          <Image
            src={EASTER_EGG_IMAGE}
            alt=""
            width={1200}
            height={1200}
            sizes="90vw"
            className="max-h-[85vh] w-auto max-w-[90vw] rounded-3xl object-contain"
          />
        </div>
      </div>,
      document.body,
    );

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-4 text-left text-sm font-semibold tracking-wide text-white transition hover:text-[#3166F0] md:text-base"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white md:h-12 md:w-12">
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              priority
              className="h-8 w-auto md:h-10"
            />
          </span>
          <span>
            Анатолий <span className="text-zinc-500">|</span> Физика ЕГЭ
          </span>
        </button>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Основная навигация">
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => handleNavClick(link.href)}
              className={linkClass(link.href)}
            >
              {link.label}
            </button>
          ))}
          <LegalDocumentsNavMenu linkClass={linkClass('#legal')} />
        </nav>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 transition hover:border-zinc-600 hover:text-white md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav"
          aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
          {isMobileMenuOpen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 5H15M3 9H15M3 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-white/10 bg-black/90 px-6 py-4 backdrop-blur-md md:hidden"
          aria-label="Мобильная навигация"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => handleNavClick(link.href)}
                className={`rounded-xl px-3 py-3 text-left ${linkClass(link.href)}`}
              >
                {link.label}
              </button>
            ))}
            <LegalDocumentsNavMenu
              variant="mobile"
              linkClass="text-sm font-semibold text-zinc-300"
              onNavigate={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </nav>
      )}

      {showEasterProgress &&
        easterClickCount >= 3 &&
        easterClickCount < EASTER_EGG_GOAL && (
          <div
            className="fixed bottom-4 right-4 z-40 rounded-xl border border-zinc-800 bg-zinc-950/95 px-3 py-2.5 shadow-lg backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <p className="text-[11px] text-zinc-400">Пасхалка найдена</p>
            <div className="my-1.5 flex gap-1">
              {Array.from({ length: EASTER_EGG_GOAL }, (_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-3 rounded-sm ${
                    index < easterClickCount ? 'bg-[#3166F0]' : 'bg-zinc-700'
                  }`}
                  aria-hidden
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-[#3166F0]">
              {easterClickCount} / {EASTER_EGG_GOAL}
            </p>
          </div>
        )}

    </header>
    {easterLightbox}
    </>
  );
}
