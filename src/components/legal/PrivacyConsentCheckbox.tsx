'use client';

import { LEGAL_DOCUMENTS } from '@/lib/legal/documents';

interface PrivacyConsentLabelProps {
  id: string;
  className?: string;
}

export function PrivacyConsentLabel({
  id,
  className = 'text-sm leading-relaxed text-zinc-400',
}: PrivacyConsentLabelProps) {
  return (
    <label htmlFor={id} className={className}>
      Я даю согласие на обработку своих персональных данных в соответствии с{' '}
      <a
        href={LEGAL_DOCUMENTS.privacy.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#3166F0] underline underline-offset-2 hover:text-[#4d7ef5]"
      >
        Политикой обработки персональных данных
      </a>
      . С Политикой обработки персональных данных ознакомлен (-на) и согласен
      (-на)
    </label>
  );
}

interface PrivacyConsentCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string | null;
}

export function PrivacyConsentCheckbox({
  id,
  checked,
  onChange,
  disabled = false,
  error = null,
}: PrivacyConsentCheckboxProps) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-black text-[#3166F0] focus:ring-[#3166F0] disabled:opacity-50"
        />
        <PrivacyConsentLabel id={id} />
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
