import {
  formatPriceRub,
  REMOTE_SERVICE_FORMAT,
  SERVICE_PACKAGES,
} from '@/lib/legal/pricing';
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';

export function LandingPricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">
          Стоимость обучения
        </h2>
        <p className="mx-auto mb-12 max-w-3xl text-center text-lg leading-8 text-zinc-400">
          Стоимость указана в рублях. Полные юридические условия — в{' '}
          <a
            href={LEGAL_DOCUMENTS.offer.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3166F0] underline underline-offset-2 hover:text-[#4d7ef5]"
          >
            {LEGAL_DOCUMENTS.offer.title}
          </a>
          .
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {SERVICE_PACKAGES.map((pkg) => (
            <article
              key={pkg.id}
              className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl"
            >
              <h3 className="text-2xl font-bold text-white md:text-3xl">
                {pkg.title}
              </h3>
              <p className="mt-3 text-3xl font-bold text-[#3166F0] md:text-4xl">
                {formatPriceRub(pkg.priceRub)}
              </p>
              <p className="mt-2 text-sm text-zinc-500">{pkg.periodLabel}</p>

              <ul className="mt-6 space-y-3 text-sm leading-relaxed text-zinc-400 md:text-base">
                {pkg.includes.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#3166F0]" aria-hidden>
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
                <li className="flex gap-2">
                  <span className="text-[#3166F0]" aria-hidden>
                    •
                  </span>
                  <span>
                    Длительность каждого занятия — {pkg.lessonDurationMinutes}{' '}
                    минут
                  </span>
                </li>
              </ul>

              <p className="mt-6 text-sm leading-relaxed text-zinc-500">
                Формат оказания услуги: {REMOTE_SERVICE_FORMAT}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
