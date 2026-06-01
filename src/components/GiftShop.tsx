import Image from 'next/image';
import { Fragment } from 'react';

const gifts = [
  'Калькулятор',
  'Сертификат на Wildberries 500 ₽',
  'Вкусняшки',
  'Канцелярия',
  'Сюрпризы',
  'И другие небольшие подарки',
];

const flowSteps = [
  { label: 'Баллы', accent: true },
  { label: 'Магазин подарков или билеты в розыгрыш', accent: false },
  { label: 'Призы', accent: true },
];

export function GiftShop() {
  return (
    <div className="mt-14">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl md:p-10">
          <h3 className="mb-4 text-2xl font-bold md:text-3xl">Магазин подарков</h3>
          <p className="mb-8 text-lg leading-8 text-zinc-400">
            Баллы можно тратить не только на участие в розыгрыше, но и обменивать
            на реальные подарки в течение всего лета.
          </p>
          <ul className="space-y-3">
            {gifts.map((gift) => (
              <li
                key={gift}
                className="flex items-start gap-3 text-base leading-snug text-zinc-200 md:text-lg"
              >
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3166F0]"
                  aria-hidden
                />
                {gift}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 p-3 shadow-[0_0_48px_rgba(49,102,240,0.22)]">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-black/40 sm:aspect-[5/4] lg:aspect-auto lg:min-h-full lg:h-full">
            <Image
              src="/summer-prizesv2.png"
              alt="Главные призы летнего сезона"
              fill
              loading="lazy"
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
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
