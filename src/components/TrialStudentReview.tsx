'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const reviewFeatures = [
  {
    title: 'Индивидуальный разбор',
    text: 'Анализируем текущие знания, находим пробелы и сильные стороны.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'Определяем цели',
    text: 'Ставим конкретные цели и разбиваем путь на шаги.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
        <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'План действий',
    text: 'Даём понятные рекомендации по теории, практике и домашним заданиям.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'Фокус на результате',
    text: 'Каждое занятие приближает к нужному баллу.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 18 10 12l4 4 6-8 4 4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function TrialStudentReview() {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLightboxOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen]);

  return (
    <>
      <div className="mt-16 border-t border-zinc-800 pt-16">
        <div className="mb-12 text-center">
          <h3 className="mx-auto mb-4 max-w-3xl text-3xl font-bold leading-tight md:text-4xl">
            Пример разбора ученика на пробном уроке
          </h3>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-zinc-400">
            После занятия вы получаете такой же разбор: понимание текущего уровня
            и конкретный план действий.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {reviewFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-zinc-800 bg-black/50 p-6 backdrop-blur-sm"
            >
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#3166F0]/30 bg-[#3166F0]/10 text-[#3166F0]">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="mb-2 text-lg font-semibold text-white">
                    {feature.title}
                  </h4>
                  <p className="leading-7 text-zinc-400">{feature.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto w-full max-w-[1100px]">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="group relative w-full cursor-zoom-in overflow-hidden rounded-[24px] border-2 border-[#3166F0] bg-white text-left shadow-[0_0_56px_rgba(49,102,240,0.28)] transition hover:shadow-[0_0_72px_rgba(49,102,240,0.36)]"
            aria-label="Открыть изображение разбора в увеличенном виде"
          >
            <div className="absolute right-4 top-4 z-10 rounded-lg bg-zinc-100/95 px-3 py-2 text-xs font-medium text-zinc-600 shadow-md backdrop-blur-sm md:text-sm">
              🔒 Данные ученика скрыты для конфиденциальности
            </div>

            <Image
              src="/probny-razbor-new.jpg"
              alt="Пример разбора ученика после пробного урока"
              width={1100}
              height={1467}
              className="h-auto w-full object-contain"
            />

            <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
          </button>

          <p className="mt-4 text-center text-sm text-zinc-500">
            Это не шаблонный план, а конкретный разбор именно вашего случая.
          </p>
        </div>
      </div>

      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Увеличенное изображение разбора"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/90 text-2xl text-zinc-300 transition hover:text-white"
            aria-label="Закрыть"
          >
            ×
          </button>

          <div
            onClick={(event) => event.stopPropagation()}
            className="relative max-h-[90vh] max-w-[min(1100px,100%)]"
          >
            <Image
              src="/probny-razbor-new.jpg"
              alt="Пример разбора ученика после пробного урока"
              width={1100}
              height={1467}
              className="max-h-[90vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
