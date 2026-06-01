'use client';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
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

const CHECKLIST_STORAGE_KEY = 'summerChecklistProgress';
const PORTAL_HOST_ATTR = 'data-summer-checklist-portal';

function activityKey(groupPoints: number, activity: string) {
  return `${groupPoints}-${activity}`;
}

function loadChecklistProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const restored: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === true) {
        restored[key] = true;
      }
    }
    return restored;
  } catch {
    return {};
  }
}

function saveChecklistProgress(checked: Record<string, boolean>) {
  try {
    const toSave = Object.fromEntries(
      Object.entries(checked).filter(([, value]) => value === true),
    );
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore quota / private mode errors
  }
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
      onMouseDown={(event) => event.preventDefault()}
      className="relative flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.03]"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
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
              d="M2.5 6.2L5 8.8L9.5 3.8"
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

type ChecklistModalProps = {
  titleId: string;
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
  onClose: () => void;
};

function ChecklistModal({
  titleId,
  checked,
  onToggle,
  onClose,
}: ChecklistModalProps) {
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        className="relative w-full max-h-[90vh] shrink-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl max-w-5xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 p-6">
          <div className="min-w-0 pr-2">
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

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-2xl leading-none text-zinc-400 transition hover:border-zinc-600 hover:text-white"
            aria-label="Закрыть чек-лист"
          >
            ×
          </button>
        </header>

        <div className="max-h-[calc(90vh-96px)] overflow-y-auto overscroll-contain bg-zinc-950 p-6">
          <div className="space-y-5">
            {checklistGroups.map((group, groupIndex) => (
              <div
                key={group.points}
                className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-lg sm:p-6"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-xl" aria-hidden>
                    {group.emoji}
                  </span>
                  <PointsBadge points={group.points} />
                </div>
                <ul className="space-y-0.5">
                  {group.activities.map((activity, activityIndex) => {
                    const key = activityKey(group.points, activity);
                    return (
                      <li key={key}>
                        <ChecklistItem
                          id={`${titleId}-g${groupIndex}-a${activityIndex}`}
                          label={activity}
                          checked={Boolean(checked[key])}
                          onToggle={() => onToggle(key)}
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
    </div>
  );
}

export const SummerChecklist = memo(function SummerChecklist() {
  const titleId = useId();
  const portalHostRef = useRef<HTMLDivElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isStorageReady, setIsStorageReady] = useState(false);

  useBodyScrollLock(isModalOpen);

  useEffect(() => {
    const host = document.createElement('div');
    host.setAttribute(PORTAL_HOST_ATTR, '');
    host.style.cssText =
      'position:fixed;inset:0;width:0;height:0;overflow:hidden;pointer-events:none;z-index:9998';
    document.body.appendChild(host);
    portalHostRef.current = host;
    setIsPortalReady(true);

    document
      .querySelectorAll(`[${PORTAL_HOST_ATTR}]`)
      .forEach((node, index, nodes) => {
        if (nodes.length > 1 && node !== host) {
          node.remove();
        }
      });

    return () => {
      host.remove();
      portalHostRef.current = null;
      setIsPortalReady(false);
    };
  }, []);

  useEffect(() => {
    setChecked(loadChecklistProgress());
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    saveChecklistProgress(checked);
  }, [checked, isStorageReady]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const toggleActivity = useCallback((key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, closeModal]);

  const portalContent =
    isModalOpen && isPortalReady && portalHostRef.current
      ? createPortal(
          <ChecklistModal
            titleId={titleId}
            checked={checked}
            onToggle={toggleActivity}
            onClose={closeModal}
          />,
          portalHostRef.current,
        )
      : null;

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

      {portalContent}
    </>
  );
});
