export type LegalDocumentId =
  | 'offer'
  | 'privacy'
  | 'personalDataConsent'
  | 'marketingConsent';

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  href: string;
  downloadName: string;
  version: string;
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  offer: {
    id: 'offer',
    title: 'Договор-оферта',
    href: '/documents/offer.pdf',
    downloadName: 'dogovor-oferta.pdf',
    version: '2026-08-01',
  },
  privacy: {
    id: 'privacy',
    title: 'Политика обработки персональных данных',
    href: '/documents/privacy-policy.pdf',
    downloadName: 'politika-obrabotki-personalnyh-dannyh.pdf',
    version: '2026-08-01',
  },
  personalDataConsent: {
    id: 'personalDataConsent',
    title: 'Согласие на обработку персональных данных',
    href: '/documents/personal-data-consent.pdf',
    downloadName: 'soglasie-na-obrabotku-personalnyh-dannyh.pdf',
    version: '2026-08-01',
  },
  marketingConsent: {
    id: 'marketingConsent',
    title: 'Согласие на рекламную рассылку',
    href: '/documents/marketing-consent.pdf',
    downloadName: 'soglasie-na-reklamnuyu-rassylku.pdf',
    version: '2026-08-01',
  },
};

export const LEGAL_DOCUMENT_LIST: LegalDocument[] = [
  LEGAL_DOCUMENTS.offer,
  LEGAL_DOCUMENTS.privacy,
  LEGAL_DOCUMENTS.personalDataConsent,
  LEGAL_DOCUMENTS.marketingConsent,
];

export const LEGAL_FOOTER_DOCUMENTS: LegalDocument[] = LEGAL_DOCUMENT_LIST;

/** @deprecated Use LEGAL_DOCUMENTS.offer.href — kept for legacy redirects */
export const LEGACY_OFFER_PATHS = [
  '/documents/oferta.pdf',
  '/oferta.pdf',
] as const;
