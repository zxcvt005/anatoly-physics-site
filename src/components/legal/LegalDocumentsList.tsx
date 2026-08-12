import { LEGAL_DOCUMENT_LIST } from '@/lib/legal/documents';

interface LegalDocumentsListProps {
  variant?: 'landing' | 'student';
}

export function LegalDocumentsList({
  variant = 'student',
}: LegalDocumentsListProps) {
  const isStudent = variant === 'student';

  return (
    <div className={isStudent ? 'grid gap-3' : 'flex flex-wrap justify-center gap-x-4 gap-y-2'}>
      {LEGAL_DOCUMENT_LIST.map((document) => (
        <a
          key={document.id}
          href={document.href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isStudent
              ? 'flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white'
              : 'text-sm text-zinc-400 underline-offset-4 transition hover:text-white hover:underline'
          }
        >
          <span>{document.title}</span>
          {isStudent ? (
            <span className="shrink-0 text-xs text-[#3166F0]">PDF</span>
          ) : null}
        </a>
      ))}
    </div>
  );
}
