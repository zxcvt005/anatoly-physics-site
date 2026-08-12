'use client';

import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';

interface MarketingConsentCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function MarketingConsentCheckbox({
  id,
  checked,
  onChange,
  disabled = false,
}: MarketingConsentCheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-black text-[#3166F0] focus:ring-[#3166F0] disabled:opacity-50"
      />
      <label htmlFor={id} className="text-sm leading-relaxed text-zinc-400">
        Я согласен (-на) получать информационные и рекламные сообщения. Ознакомлен
        (-на) с{' '}
        <a
          href={LEGAL_DOCUMENTS.marketingConsent.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3166F0] underline underline-offset-2 hover:text-[#4d7ef5]"
        >
          {LEGAL_DOCUMENTS.marketingConsent.title}
        </a>
      </label>
    </div>
  );
}
