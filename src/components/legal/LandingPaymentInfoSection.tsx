import { ACCEPTED_PAYMENT_SYSTEMS } from '@/lib/legal/payment-config';
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';
import { REMOTE_SERVICE_FORMAT } from '@/lib/legal/pricing';

export function LandingPaymentInfoSection() {
  return (
    <section id="payment-info" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold md:text-5xl">Оплата</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
            Оплата образовательных услуг производится в рублях. Подробные условия
            оплаты и возврата — в{' '}
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
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <h3 className="text-xl font-semibold text-white">Способы оплаты</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Оплата производится банковской картой через защищённую платёжную
            страницу банка в личном кабинете ученика. Принимаются платёжные
            системы: {ACCEPTED_PAYMENT_SYSTEMS.join(', ')}.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Для безопасности операций используется технология 3D-Secure. Данные
            банковской карты обрабатываются на стороне банка и не сохраняются на
            сайте репетитора.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <h3 className="text-xl font-semibold text-white">
            Возврат и отказ от услуги
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Порядок отказа от услуги и возврата денежных средств определяется
            условиями{' '}
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
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          <h3 className="text-xl font-semibold text-white">Формат оказания услуг</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Услуги оказываются дистанционно. Физическая доставка товаров не
            осуществляется — приобретается образовательная услуга.{' '}
            {REMOTE_SERVICE_FORMAT}
          </p>
        </div>
      </div>
    </section>
  );
}
