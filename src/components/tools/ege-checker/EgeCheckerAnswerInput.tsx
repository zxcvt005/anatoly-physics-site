'use client';

import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';

type EgeCheckerAnswerInputProps = {
  id: string;
  label: string;
  value: string;
  enterKeyHint?: 'next' | 'done';
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
  onShiftEnter?: () => void;
  onBlur?: () => void;
};

export function EgeCheckerAnswerInput({
  id,
  label,
  value,
  enterKeyHint = 'next',
  autoFocus = false,
  onChange,
  onEnter,
  onShiftEnter,
  onBlur,
}: EgeCheckerAnswerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }

    const node = inputRef.current;
    if (!node) {
      return;
    }

    node.focus();
    node.select();
  }, [autoFocus, id]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) {
      onShiftEnter?.();
      return;
    }

    onEnter();
  };

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        className="w-full rounded-2xl border border-zinc-800 bg-black/50 px-4 py-4 text-2xl font-semibold tracking-wide text-white outline-none transition placeholder:text-zinc-600 focus:border-[#3166F0]/60 focus:ring-1 focus:ring-[#3166F0]/40 sm:text-3xl"
        aria-label={label}
      />
    </div>
  );
}
