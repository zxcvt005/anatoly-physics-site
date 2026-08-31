'use client';

import { BadgeCheck, Flame, Star, type LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { ProfiWidget } from '@/components/ProfiWidget';

const PROFI_PROFILE_URL = 'https://profi.ru/profile/GusynAV';

const STAT_ICON_SIZE = 22;
const STAT_ICON_STROKE = 1.75;

function ShieldIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-[#3166F0]"
    >
      <path
        d="M12 3L4 6.5V11.5C4 16.2 7.1 20.5 12 21.5C16.9 20.5 20 16.2 20 11.5V6.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 12L11 14L15.5 9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const stats: {
  icon: LucideIcon;
  value: string;
  label: string;
  valueClassName?: string;
}[] = [
  { icon: Star, value: '5,0', label: 'рейтинг' },
  {
    icon: Flame,
    value: 'Очень хвалят',
    label: 'доверие клиентов',
    valueClassName:
      'text-sm font-bold leading-tight text-white sm:text-base md:text-lg',
  },
  {
    icon: BadgeCheck,
    value: 'Профиль подтверждён',
    label: 'на Profi.ru',
    valueClassName:
      'text-sm font-bold leading-tight text-white sm:text-base md:text-lg',
  },
];

export const ProfiTrust = memo(function ProfiTrust() {
  return (
    <div className="relative mt-10 w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_0_48px_rgba(49,102,240,0.12)] md:p-8 md:pb-7 lg:px-10 lg:pt-9 lg:pb-8">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#3166F0]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10">
        <div className="order-1">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#3166F0]/30 bg-[#3166F0]/10">
            <ShieldIcon />
          </div>

          <h3 className="mb-3 text-2xl font-bold md:text-3xl">
            Профиль на Profi.ru
          </h3>
          <p className="mb-8 max-w-xl text-base leading-7 text-zinc-400 md:text-lg md:leading-8">
            Отзывы моих учеников и подтверждённый профиль на Profi.ru — гарантия
            качества и профессионального подхода.
          </p>

          <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-black/40 px-2 py-4 text-center sm:px-3"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#3166F0]/30 bg-[#3166F0]/10">
                    <Icon
                      size={STAT_ICON_SIZE}
                      strokeWidth={STAT_ICON_STROKE}
                      className="text-[#3166F0]"
                      aria-hidden
                    />
                  </div>
                  <p
                    className={
                      stat.valueClassName ??
                      'text-xl font-bold leading-none text-white sm:text-2xl md:text-3xl'
                    }
                  >
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs text-white sm:text-sm">
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>

          <a
            href={PROFI_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#3166F0] px-8 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(49,102,240,0.35)] transition hover:scale-[1.02] hover:bg-[#2858d4] sm:w-auto sm:min-w-[280px]"
          >
            Смотреть профиль
          </a>
        </div>

        <div className="order-2 flex flex-col items-center gap-3 lg:items-center lg:justify-center">
          <div
            className="w-fit max-w-full rounded-xl border border-zinc-700/80 bg-white/[0.04] p-2 shadow-[0_0_20px_rgba(49,102,240,0.1)] backdrop-blur-sm"
          >
            <ProfiWidget />
          </div>

          <p className="max-w-[300px] text-center text-xs leading-5 text-zinc-500">
            Актуальный рейтинг и количество отзывов — в официальном виджете
            Profi.ru
          </p>
        </div>
      </div>
    </div>
  );
});
