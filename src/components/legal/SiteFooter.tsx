import { LegalDocumentsList } from '@/components/legal/LegalDocumentsList';
import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';
import { BUSINESS_REQUISITES } from '@/lib/legal/requisites';

export function SiteFooter() {
  return (
    <footer
      id="legal"
      className="scroll-mt-20 border-t border-zinc-800 px-6 py-12 text-zinc-500"
    >
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-6">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Реквизиты
          </h2>
          <div className="mx-auto max-w-2xl space-y-2 text-sm leading-relaxed text-zinc-300">
            <p>{BUSINESS_REQUISITES.legalName}</p>
            <p>ИНН {BUSINESS_REQUISITES.inn}</p>
            <p>ОГРНИП {BUSINESS_REQUISITES.ogrnip}</p>
            <p>Адрес: {BUSINESS_REQUISITES.address}</p>
            <p>Телефон: {BUSINESS_REQUISITES.phone}</p>
            <p>Telegram: {BUSINESS_REQUISITES.telegram}</p>
            <p>E-mail: {BUSINESS_REQUISITES.email}</p>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Юридические документы
          </h2>
          <LegalDocumentsList variant="landing" />
        </div>

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
