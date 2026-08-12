'use client';

import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';

interface LegalDocumentLinkProps {
  documentId: keyof typeof LEGAL_DOCUMENTS;
  className?: string;
  openInNewTab?: boolean;
}

export function LegalDocumentLink({
  documentId,
  className = 'text-[#3166F0] underline underline-offset-2 hover:text-[#4d7ef5]',
  openInNewTab = true,
}: LegalDocumentLinkProps) {
  const document = LEGAL_DOCUMENTS[documentId];

  return (
    <a
      href={document.href}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      className={className}
    >
      {document.title}
    </a>
  );
}
