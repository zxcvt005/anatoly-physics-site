'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import { copyStudentCabinetLink } from '@/lib/copy-student-link';

interface StudentCabinetLinkActionsProps {
  token: string;
  compact?: boolean;
}

export function StudentCabinetLinkActions({
  token,
  compact = false,
}: StudentCabinetLinkActionsProps) {
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const handleCopy = useCallback(async () => {
    const result = await copyStudentCabinetLink(token);

    if (result.ok) {
      setCopied(true);
      setFallbackUrl(null);
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }

    setFallbackUrl(result.url);
    setCopied(false);
  }, [token]);

  const buttonClass = compact
    ? 'rounded-lg border border-zinc-700 px-2.5 py-1 text-xs'
    : 'rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-medium';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={`/student/${token}`}
          className={`${buttonClass} inline-flex text-[#6B93FF] transition hover:border-[#3166F0]/50 hover:text-white`}
        >
          Открыть
        </Link>
        <button
          type="button"
          onClick={handleCopy}
          className={`${buttonClass} inline-flex items-center gap-1 text-zinc-300 transition hover:border-[#3166F0]/50 hover:text-white`}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" aria-hidden />
              <span className="text-emerald-400">Ссылка скопирована</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden />
              Скопировать ссылку
            </>
          )}
        </button>
      </div>
      {fallbackUrl && (
        <p className="max-w-[220px] break-all text-[10px] leading-snug text-zinc-500">
          Скопируйте вручную:{' '}
          <span className="select-all text-zinc-400">{fallbackUrl}</span>
        </p>
      )}
    </div>
  );
}
