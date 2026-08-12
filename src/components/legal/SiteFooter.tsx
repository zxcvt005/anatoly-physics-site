import { LegalDocumentsList } from '@/components/legal/LegalDocumentsList';
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';
import {
  BUSINESS_REQUISITES,
  getPublishedRequisites,
  hasBusinessRequisites,
} from '@/lib/legal/requisites';

export function SiteFooter() {
  const requisites = getPublishedRequisites();

  return (
    <footer
      id="legal"
      className="scroll-mt-20 border-t border-zinc-800 px-6 py-12 text-zinc-500"
    >
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">
            {BUSINESS_REQUISITES.legalName ?? 'Анатолий — репетитор по физике ЕГЭ'}
          </p>
          {BUSINESS_REQUISITES.telegram ? (
            <p className="mt-2">Telegram: {BUSINESS_REQUISITES.telegram}</p>
          ) : null}
          {BUSINESS_REQUISITES.phone ? (
            <p className="mt-1">{BUSINESS_REQUISITES.phone}</p>
          ) : null}
        </div>

        <div>
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Юридические документы
          </h2>
          <LegalDocumentsList variant="landing" />
        </div>

        {requisites.length > 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-6">
            <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Реквизиты
            </h2>
            <dl className="mx-auto grid max-w-2xl gap-3 text-sm sm:grid-cols-2">
              {requisites.map((entry) => (
                <div key={entry.label}>
                  <dt className="text-zinc-500">{entry.label}</dt>
                  <dd className="mt-1 text-zinc-300">{entry.value}</dd>
                </div>
              ))}
            </dl>
            {!hasBusinessRequisites() ? (
              <p className="mt-4 text-center text-xs text-amber-300/80">
                Для подключения эквайринга заполните наименование ИП, ОГРНИП и ИНН
                в файле <code className="text-zinc-400">src/lib/legal/requisites.ts</code>.
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="text-center text-xs leading-relaxed text-zinc-600">
          Полные условия оказания услуг, оплаты и возврата — в{' '}
          <a
            href={LEGAL_DOCUMENTS.offer.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 underline underline-offset-2 hover:text-white"
          >
            {LEGAL_DOCUMENTS.offer.title}
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
