'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { SummerSchoolPlaceScale } from '@/lib/tools/summer-school-results';

const scaleClass = {
  moderate: {
    rank: 'text-6xl font-bold leading-none tracking-tight text-[#3166F0] sm:text-7xl',
    title:
      'mt-3 text-xl font-semibold tracking-[0.28em] text-zinc-300 sm:text-2xl',
    name: 'text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl',
    glow: 'h-36 w-36 sm:h-48 sm:w-48',
    align: 'text-left',
  },
  expressive: {
    rank: 'text-7xl font-bold leading-none tracking-tight text-[#3166F0] sm:text-8xl',
    title:
      'mt-4 text-2xl font-semibold tracking-[0.32em] text-zinc-200 sm:text-3xl',
    name: 'text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl',
    glow: 'h-44 w-44 sm:h-60 sm:w-60',
    align: 'text-left',
  },
  grand: {
    rank: 'text-8xl font-bold leading-none tracking-tight text-[#3166F0] sm:text-9xl',
    title:
      'mt-5 text-2xl font-semibold tracking-[0.36em] text-white sm:text-3xl md:text-4xl',
    name: 'text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-7xl md:text-8xl',
    glow: 'h-52 w-52 sm:h-72 sm:w-72',
    align: 'text-center',
  },
} as const;

type SummerSchoolWinnerRevealProps = {
  rank: string;
  title: string;
  name: string;
  nameRevealed: boolean;
  showNumber: boolean;
  showTitle: boolean;
  showIdentity: boolean;
  showName: boolean;
  scale: SummerSchoolPlaceScale;
  showCongratulations: boolean;
  settingsHidden: boolean;
  onReveal: () => void;
  onRename: (name: string) => void;
};

export function SummerSchoolWinnerReveal({
  rank,
  title,
  name,
  nameRevealed,
  showNumber,
  showTitle,
  showIdentity,
  showName,
  scale,
  showCongratulations,
  settingsHidden,
  onReveal,
  onRename,
}: SummerSchoolWinnerRevealProps) {
  const classes = scaleClass[scale];
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [nameAnimKey, setNameAnimKey] = useState(0);

  useEffect(() => {
    setDraft(name);
  }, [name]);

  useEffect(() => {
    setNameAnimKey((current) => current + 1);
  }, [name]);

  const handleRename = (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next) {
      return;
    }
    onRename(next);
    setIsEditing(false);
  };

  const canReveal = name.length > 0 && !nameRevealed;
  const editHiddenClass = settingsHidden
    ? 'opacity-0 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100'
    : '';

  return (
    <div className={classes.align}>
      {showNumber && (
        <p
          className={`${classes.rank} motion-reduce:animate-none animate-[ss-fade-up_0.7s_cubic-bezier(0.22,1,0.36,1)_both]`}
        >
          {rank}
        </p>
      )}

      {showTitle && (
        <p
          className={`${classes.title} motion-reduce:animate-none animate-[ss-fade-up_0.7s_cubic-bezier(0.22,1,0.36,1)_both]`}
        >
          {title}
        </p>
      )}

      {showIdentity && (
        <div className="relative mt-8 sm:mt-10">
          {showName ? (
            <div className="relative">
              <div
                className={`pointer-events-none absolute left-1/2 top-1/2 -z-10 ${classes.glow} -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3166F0] blur-3xl motion-reduce:animate-none animate-[ss-glow-pulse_3.4s_ease-in-out_infinite]`}
                aria-hidden
              />
              <p
                key={nameAnimKey}
                className={`${classes.name} break-words motion-reduce:animate-none animate-[ss-name-reveal_0.9s_cubic-bezier(0.16,1,0.3,1)_both] drop-shadow-[0_0_42px_rgba(49,102,240,0.45)]`}
              >
                {name}
              </p>
            </div>
          ) : (
            <p className="text-xl font-medium tracking-wide text-zinc-500 sm:text-2xl animate-[ss-fade-up_0.6s_ease-out_both]">
              Победитель ещё не объявлен
            </p>
          )}
        </div>
      )}

      {showName && showCongratulations && (
        <p className="mt-8 text-lg font-medium tracking-wide text-zinc-300 sm:text-xl animate-[ss-fade-up_0.7s_ease-out_both]">
          Поздравляем!
        </p>
      )}

      {showIdentity && (
        <div className={`mt-6 ${classes.align === 'text-center' ? 'flex flex-col items-center' : ''}`}>
          {canReveal && (
            <button
              type="button"
              onClick={onReveal}
              className="rounded-full bg-[#3166F0] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(49,102,240,0.35)] transition hover:bg-[#2858d4]"
            >
              Показать победителя
            </button>
          )}

          {nameRevealed && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className={`rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-400 backdrop-blur-sm transition hover:border-white/20 hover:text-white ${editHiddenClass}`}
            >
              Изменить
            </button>
          )}

          {isEditing && (
            <form
              onSubmit={handleRename}
              className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-center"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-label="Новое имя победителя"
                className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-2.5 text-sm text-white outline-none backdrop-blur-sm placeholder:text-zinc-500 focus:border-[#3166F0]"
                placeholder="Введите имя"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-[#3166F0] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(name);
                    setIsEditing(false);
                  }}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-400"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
