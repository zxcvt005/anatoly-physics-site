'use client';

import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import {
  QUESTION_COUNT,
  QUESTION_RULES,
  QUESTION_TYPE_LABELS,
} from '@/lib/tools/ege-checker/constants';
import { getMissingReferenceNumbers } from '@/lib/tools/ege-checker/scoring';
import type { AnswerMap } from '@/lib/tools/ege-checker/types';

type EgeCheckerReferenceEditorProps = {
  references: AnswerMap;
  savedNotice: boolean;
  onChange: (number: number, value: string) => void;
  onBlur: (number: number) => void;
  onEnter: (number: number) => void;
  onSave: () => void;
  onClear: () => void;
};

export function EgeCheckerReferenceEditor({
  references,
  savedNotice,
  onChange,
  onBlur,
  onEnter,
  onSave,
  onClear,
}: EgeCheckerReferenceEditorProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const missing = getMissingReferenceNumbers(references);
  const filledCount = QUESTION_RULES.length - missing.length;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    number: number,
  ) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (number < QUESTION_COUNT) {
      const next = inputRefs.current[number];
      next?.focus();
      next?.select();
    }

    onEnter(number);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Эталонные ответы</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Заполнено {filledCount} из {QUESTION_RULES.length} эталонов
          </p>
          {missing.length > 0 ? (
            <p className="mt-1 text-sm text-amber-200">
              Не заполнены: {missing.join(', ')}
            </p>
          ) : (
            <p className="mt-1 text-sm text-emerald-300">Все эталоны заполнены</p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#3166F0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2856d4]"
          >
            {savedNotice ? 'Сохранено' : 'Сохранить эталоны'}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-red-500/40 hover:text-red-300"
          >
            Очистить эталоны
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-950/80">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">№</th>
              <th className="px-4 py-3 font-medium">Тип</th>
              <th className="px-4 py-3 font-medium">Макс. балл</th>
              <th className="px-4 py-3 font-medium">Эталон</th>
            </tr>
          </thead>
          <tbody>
            {QUESTION_RULES.map((rule, index) => {
              const key = String(rule.number);
              return (
                <tr key={rule.number} className="border-b border-zinc-900 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-white">{rule.number}</td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    {QUESTION_TYPE_LABELS[rule.type]}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-300">{rule.maxScore}</td>
                  <td className="px-4 py-2.5">
                    <input
                      ref={(node) => {
                        inputRefs.current[index] = node;
                      }}
                      id={`ege-reference-${rule.number}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      enterKeyHint={rule.number === 20 ? 'done' : 'next'}
                      value={references[key] ?? ''}
                      onChange={(event) => onChange(rule.number, event.target.value)}
                      onBlur={() => onBlur(rule.number)}
                      onKeyDown={(event) => handleKeyDown(event, rule.number)}
                      className="w-full min-w-[8rem] rounded-xl border border-zinc-800 bg-black/50 px-3 py-2.5 text-base text-white outline-none transition focus:border-[#3166F0]/60 focus:ring-1 focus:ring-[#3166F0]/40"
                      aria-label={`Эталон задания ${rule.number}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
