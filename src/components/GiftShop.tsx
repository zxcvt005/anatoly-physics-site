'use client';

import Image from 'next/image';
import { useMemo } from 'react';

/** Дата следующего обновления ассортимента (YYYY-MM-DD) */
const NEXT_SHOP_UPDATE_DATE = '2026-07-26';

type GiftItem = {
  id: string;
  title: string;
  price: number;
  highlight?: 'golden-frame';
};

const GIFT_ITEMS: GiftItem[] = [
  {
    id: 'sweets',
    title: "Skittles, M&M's, Kinder, Snickers, KitKat и т.д.",
    price: 20,
  },
  {
    id: 'stationery',
    title: 'Канцелярия на выбор',
    price: 30,
  },
  {
    id: 'phone-case',
    title: 'Чехол',
    price: 80,
  },
  {
    id: 'book',
    title: 'Книга на выбор',
    price: 100,
  },
  {
    id: 'cinema',
    title: 'Билет в кино',
    price: 120,
  },
  {
    id: 'calculator',
    title: 'Инженерный калькулятор',
    price: 200,
  },
  {
    id: 'gift-card',
    title: 'Подарочная карта WB, Steam, Ozon, AppStore, Золотое Яблоко',
    price: 200,
  },
  {
    id: 'pizza',
    title: 'Пицца ДОДО',
    price: 250,
  },
  {
    id: 'golden-frame',
    title: 'Золотая анимированная рамка в топе до конца лета',
    price: 250,
    highlight: 'golden-frame',
  },
];

const flowSteps = [
  { label: 'Баллы', accent: true },
  { label: 'Магазин подарков или билеты в розыгрыш', accent: false },
  { label: 'Призы', accent: true },
];

function pluralizeDays(count: number): string {
  const n = Math.max(0, count);
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${n} день`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${n} дня`;
  }

  return `${n} дней`;
}

function parseLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDaysUntilUpdate(updateDateKey: string): number {
  const updateDate = parseLocalDate(updateDateKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  updateDate.setHours(0, 0, 0, 0);

  const diffMs = updateDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatRussianDate(dateKey: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseLocalDate(dateKey));
}

function PriceBadge({ price }: { price: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-[#3166F0]/40 bg-[#3166F0]/15 px-3 py-1 text-sm font-bold text-[#3166F0]">
      {price} баллов
    </span>
  );
}

function GiftCard({ item }: { item: GiftItem }) {
  if (item.highlight === 'golden-frame') {
    return <GoldenFrameGiftCard item={item} />;
  }

  return (
    <article className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg transition hover:border-zinc-700 hover:bg-zinc-900/80">
      <h4 className="text-base font-semibold leading-snug text-zinc-100 md:text-lg">
        {item.title}
      </h4>
      <PriceBadge price={item.price} />
    </article>
  );
}

function GoldenFrameGiftCard({ item }: { item: GiftItem }) {
  return (
    <article className="relative h-full">
      <div className="gift-shop-golden-frame h-full rounded-2xl p-[3px]">
        <div className="flex h-full flex-col justify-between gap-4 rounded-[13px] bg-zinc-950/95 p-5">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
              Премиум-награда
            </p>
            <h4 className="text-base font-semibold leading-snug text-amber-50 md:text-lg">
              {item.title}
            </h4>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-amber-400/50 bg-amber-400/15 px-3 py-1 text-sm font-bold text-amber-300">
            {item.price} баллов
          </span>
        </div>
      </div>
    </article>
  );
}

function ShopUpdateBanner({
  updateDateKey,
  daysRemaining,
}: {
  updateDateKey: string;
  daysRemaining: number;
}) {
  const safeDays = Math.max(0, daysRemaining);

  return (
    <div className="rounded-2xl border border-[#3166F0]/25 bg-gradient-to-br from-[#3166F0]/10 via-zinc-950 to-zinc-950 p-5 sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6B93FF]">
        Обновление ассортимента
      </p>
      <p className="mt-3 text-base leading-relaxed text-zinc-300 md:text-lg">
        Магазин обновляется каждые 3 недели. Некоторые товары могут исчезнуть, а
        вместо них появятся новые.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3">
          <dt className="text-xs text-zinc-500">Следующее обновление</dt>
          <dd className="mt-1 text-sm font-semibold text-white md:text-base">
            {formatRussianDate(updateDateKey)}
          </dd>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3">
          <dt className="text-xs text-zinc-500">До обновления осталось</dt>
          <dd className="mt-1 text-sm font-semibold text-[#6B93FF] md:text-base">
            {daysRemaining > 0
              ? pluralizeDays(safeDays)
              : 'Обновление уже скоро'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function GiftShop() {
  const daysUntilUpdate = useMemo(
    () => getDaysUntilUpdate(NEXT_SHOP_UPDATE_DATE),
    [],
  );

  return (
    <div className="mt-14">
      <style jsx global>{`
        @keyframes gift-shop-golden-shimmer {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes gift-shop-golden-glow {
          0%,
          100% {
            box-shadow:
              0 0 18px rgba(255, 215, 0, 0.25),
              0 0 36px rgba(212, 175, 55, 0.12);
          }
          50% {
            box-shadow:
              0 0 28px rgba(255, 215, 0, 0.45),
              0 0 52px rgba(212, 175, 55, 0.22);
          }
        }

        .gift-shop-golden-frame {
          background: linear-gradient(
            120deg,
            #6b4e0a,
            #c9a227,
            #fff4b8,
            #ffd700,
            #f0d78c,
            #b8860b,
            #fff8dc,
            #c9a227
          );
          background-size: 300% 300%;
          animation:
            gift-shop-golden-shimmer 5s ease-in-out infinite,
            gift-shop-golden-glow 4s ease-in-out infinite;
        }
      `}</style>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
        <div className="min-w-0">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl md:p-8">
            <h3 className="mb-3 text-2xl font-bold md:text-3xl">
              Магазин подарков
            </h3>
            <p className="mb-6 text-base leading-8 text-zinc-400 md:text-lg">
              Баллы можно тратить не только на участие в розыгрыше, но и обменивать
              на реальные подарки в течение всего лета.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {GIFT_ITEMS.map((item) => (
                <GiftCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <ShopUpdateBanner
              updateDateKey={NEXT_SHOP_UPDATE_DATE}
              daysRemaining={daysUntilUpdate}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 p-3 shadow-[0_0_48px_rgba(49,102,240,0.22)] lg:sticky lg:top-24">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-black/40 sm:aspect-[5/4]">
            <Image
              src="/summer-prizesv2.png"
              alt="Главные призы летнего сезона"
              fill
              loading="lazy"
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
          <p className="mt-3 px-2 text-center text-sm text-zinc-500">
            Главные призы сезона
          </p>
        </div>
      </div>

      <div
        className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-6 sm:px-8"
        aria-label="Как тратятся баллы"
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          {flowSteps.map((step, index) => (
            <div
              key={step.label}
              className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4"
            >
              <div
                className={`w-full rounded-2xl border px-5 py-3 text-center text-sm font-semibold leading-snug sm:w-auto sm:max-w-xs md:max-w-md md:text-base ${
                  step.accent
                    ? 'border-[#3166F0]/40 bg-[#3166F0]/10 text-[#3166F0]'
                    : 'border-zinc-700 bg-black/40 text-zinc-200'
                }`}
              >
                {step.label}
              </div>
              {index < flowSteps.length - 1 && (
                <>
                  <span
                    className="text-2xl text-zinc-600 sm:hidden"
                    aria-hidden
                  >
                    ↓
                  </span>
                  <span
                    className="hidden text-2xl text-zinc-600 sm:inline"
                    aria-hidden
                  >
                    →
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
