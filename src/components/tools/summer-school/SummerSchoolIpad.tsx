import { SUMMER_SCHOOL_IMAGES } from '@/lib/tools/summer-school-results';
import { SummerSchoolPrizeImage } from '@/components/tools/summer-school/SummerSchoolPrizeImage';
import Link from 'next/link';

const chanceSteps = ['Билетов', 'Больше шанс', 'Один победитель'] as const;

export function SummerSchoolIpad() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 px-5 py-16 sm:px-10 sm:py-24 lg:px-14">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-[#3166F0]/16 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[#3166F0]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <p className="text-2xl font-medium text-zinc-300 sm:text-4xl">А теперь —</p>
        <h2 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
          самое интересное.
        </h2>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.4em] text-[#3166F0] sm:text-base">
          Розыгрыш iPad
        </p>

        <div className="mt-8 max-w-2xl space-y-4 text-base leading-relaxed text-zinc-400 sm:text-xl">
          <p>Но на этом летняя школа не заканчивается.</p>
          <p>
            Все участники, которые заработали билеты в течение летней школы, получили
            возможность побороться за главный приз.
          </p>
          <p>Количество билетов влияет на вероятность победы.</p>
          <p className="text-zinc-200">
            Чем больше билетов —
            <br />
            тем больше шанс.
          </p>
        </div>

        <div className="mt-12 flex max-w-xl flex-col items-center">
          {chanceSteps.map((step, index) => (
            <div key={step} className="flex w-full flex-col items-center">
              <div className="w-full rounded-2xl border border-[#3166F0]/25 bg-[#3166F0]/10 px-5 py-5 text-center">
                <p className="text-xl font-bold uppercase tracking-[0.18em] text-white sm:text-2xl">
                  {step}
                </p>
              </div>
              {index < chanceSteps.length - 1 && (
                <span className="py-2 text-3xl font-light text-[#3166F0]" aria-hidden>
                  ↓
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14">
          <SummerSchoolPrizeImage
            src={SUMMER_SCHOOL_IMAGES.ipad}
            alt="iPad"
            label="iPad"
            className="aspect-[4/3] w-full max-w-3xl shadow-[0_0_80px_rgba(49,102,240,0.16)]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 768px"
          />
          <div className="mt-8">
            <p className="text-4xl font-bold text-white sm:text-5xl">iPad</p>
            <p className="mt-3 text-lg text-zinc-400 sm:text-xl">
              Один победитель.
              <br />
              Один главный приз.
            </p>
          </div>
        </div>

        <Link
          href="/tools/non-physics/fortune-wheel"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition hover:scale-[1.03] sm:px-10 sm:text-lg"
        >
          Перейти к розыгрышу
        </Link>
      </div>
    </section>
  );
}
