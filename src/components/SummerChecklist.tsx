'use client';

import { memo, useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

type ChecklistGroup = {
  points: number;
  emoji: string;
  activities: string[];
};

const checklistGroups: ChecklistGroup[] = [
  {
    points: 5,
    emoji: '🍉',
    activities: [
      'Съесть арбуз',
      'Съесть мороженое',
      'Искупаться',
      'Покататься на велосипеде',
      'Погулять под дождём',
      'Сделать фото босиком на траве',
      'Собрать букет полевых цветов',
      'Посмотреть на звезды в ночном небе',
      'Запустить мыльные пузыри',
      'Найти божью коровку',
      'Съесть кукурузу',
      'Поесть шашлык',
    ],
  },
  {
    points: 10,
    emoji: '🌅',
    activities: [
      'Посмотреть на рассвет',
      'Увидеть радугу',
      'Посидеть у костра',
      'Сходить в лес',
      'Испечь что-нибудь',
      'Устроить утреннюю пробежку',
      'Сходить в музей',
      'Собрать гербарий',
      'Устроить пикник',
      'Искупаться в любом водоеме',
      'Сделать кормушку для птиц',
    ],
  },
  {
    points: 15,
    emoji: '🏆',
    activities: [
      'Пройти 25 000 шагов',
      'Поймать рыбу',
      'Научиться жонглировать',
      'Собрать корзину грибов или ягод',
      'Покормить уток',
      'Увидеть белку',
      'Сделать фото с подсолнухом',
    ],
  },
];

function activityKey(groupPoints: number, activity: string) {
  return `${groupPoints}-${activity}`;
}

function PointsBadge({ points }: { points: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-[#3166F0]/40 bg-[#3166F0]/15 px-3 py-1 text-sm font-bold text-[#3166F0]">
      +{points} баллов
    </span>
  );
}

function ChecklistItem({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.03]"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="peer sr-only"
      />
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
          checked
            ? 'border-[#3166F0] bg-[#3166F0]'
            : 'border-zinc-600 bg-transparent'
        }`}
        aria-hidden
      >
        {checked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            className="text-white"
          >
            <path
              d="M2.5 6.2L5 8.7L9.5 3.8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        className={`text-sm leading-snug md:text-base ${
          checked ? 'text-zinc-500 line-through' : 'text-zinc-200'
        }`}
      >
        {label}
      </span>
    </label>
  );
}

export const SummerChecklist = memo(function SummerChecklist() {
  const titleId = useId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const toggleActivity = useCallback((key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen, closeModal]);

  const checklistModal =
    isModalOpen &&
    isMounted &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6"
        onClick={closeModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 z-[110] flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/90 text-2xl leading-none text-zinc-400 transition hover:border-zinc-600 hover:text-white"
          aria-label="Закрыть чек-лист"
        >
          ×
        </button>

        <div
          onClick={(event) => event.stopPropagation()}
          className="relative z-[105] flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 shadow-2xl"
        >
          <div className="shrink-0 border-b border-zinc-800 px-5 py-5 pr-14 sm:px-8 sm:py-6 sm:pr-16">
            <p className="mb-1 text-xs uppercase tracking-[0.25em] text-[#3166F0]">
              ☀️ Летний сезон
            </p>
            <h2
              id={titleId}
              className="text-xl font-bold leading-tight sm:text-2xl md:text-3xl"
            >
              Летний чек-лист активностей
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400 sm:text-base">
              Отмечай выполненные задания — баллы засчитываются в рейтинг.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">
            <div className="space-y-5">
              {checklistGroups.map((group) => (
                <div
                  key={group.points}
                  className="rounded-2xl border border-zinc-800 bg-black/40 p-5 shadow-lg sm:p-6"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="text-xl" aria-hidden>
                      {group.emoji}
                    </span>
                    <PointsBadge points={group.points} />
                  </div>
                  <ul className="space-y-0.5">
                    {group.activities.map((activity) => {
                      const key = activityKey(group.points, activity);
                      return (
                        <li key={key}>
                          <ChecklistItem
                            id={`${titleId}-${key}`}
                            label={activity}
                            checked={Boolean(checked[key])}
                            onToggle={() => toggleActivity(key)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <div className="relative mt-14 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl md:p-10">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#3166F0]/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-[#3166F0]">
            ☀️ Лето 2026
          </p>
          <h3 className="mb-4 text-2xl font-bold md:text-3xl">
            Летний чек-лист активностей
          </h3>
          <p className="mb-8 max-w-2xl text-lg leading-8 text-zinc-400">
            Выполняй летние задания, отмечай их и получай дополнительные баллы в
            рейтинге.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-[#3166F0] px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_32px_rgba(49,102,240,0.35)] transition hover:scale-[1.02] hover:bg-[#2858d4]"
          >
            Открыть чек-лист
          </button>
        </div>
      </div>

      {checklistModal}
    </>
  );
});
