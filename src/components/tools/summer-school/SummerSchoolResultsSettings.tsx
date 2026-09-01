'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Settings } from 'lucide-react';
import type { SummerSchoolResultsState } from '@/lib/tools/summer-school-results';

type SummerSchoolResultsSettingsProps = {
  state: SummerSchoolResultsState;
  onSave: (names: {
    thirdPlaceName: string;
    secondPlaceName: string;
    firstPlaceName: string;
  }) => void;
  onReveal: (place: 'third' | 'second' | 'first') => void;
  onHide: () => void;
  onShow: () => void;
};

const fields = [
  { id: 'third' as const, nameKey: 'thirdPlaceName' as const, label: '3 место' },
  { id: 'second' as const, nameKey: 'secondPlaceName' as const, label: '2 место' },
  { id: 'first' as const, nameKey: 'firstPlaceName' as const, label: '1 место' },
];

export function SummerSchoolResultsSettings({
  state,
  onSave,
  onReveal,
  onHide,
  onShow,
}: SummerSchoolResultsSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [draft, setDraft] = useState({
    thirdPlaceName: state.thirdPlaceName,
    secondPlaceName: state.secondPlaceName,
    firstPlaceName: state.firstPlaceName,
  });

  useEffect(() => {
    setDraft({
      thirdPlaceName: state.thirdPlaceName,
      secondPlaceName: state.secondPlaceName,
      firstPlaceName: state.firstPlaceName,
    });
  }, [state.firstPlaceName, state.secondPlaceName, state.thirdPlaceName]);

  useEffect(() => {
    if (!savedMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSavedMessage(false), 2400);
    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  const handleSave = (event?: FormEvent) => {
    event?.preventDefault();
    onSave(draft);
    setSavedMessage(true);
  };

  if (state.settingsHidden) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          onShow();
        }}
        className="absolute right-1 top-1 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-medium text-zinc-500 backdrop-blur-md transition hover:border-white/20 hover:text-white"
        aria-label="Открыть настройки результатов"
      >
        <Settings className="h-3.5 w-3.5" />
        Настройки
      </button>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 backdrop-blur-md transition hover:border-white/20 hover:text-white"
        >
          <Settings className="h-4 w-4" />
          {isOpen ? 'Свернуть настройки' : 'Настроить результаты'}
        </button>
        <button
          type="button"
          onClick={onHide}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          Скрыть настройки
        </button>
      </div>

      {isOpen && (
        <form
          onSubmit={handleSave}
          className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_40px_rgba(49,102,240,0.08)] backdrop-blur-xl sm:p-5"
        >
          <p className="mb-4 text-sm font-semibold tracking-wide text-white">
            Результаты летней школы
          </p>

          <div className="grid gap-3">
            {fields.map((field) => {
              const revealed =
                field.id === 'third'
                  ? state.thirdPlaceRevealed
                  : field.id === 'second'
                    ? state.secondPlaceRevealed
                    : state.firstPlaceRevealed;
              const hasName = draft[field.nameKey].trim().length > 0;

              return (
                <div
                  key={field.id}
                  className="grid gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <label
                    htmlFor={`summer-school-${field.id}`}
                    className="text-sm text-zinc-400"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`summer-school-${field.id}`}
                    value={draft[field.nameKey]}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.nameKey]: event.target.value,
                      }))
                    }
                    placeholder="Введите имя победителя"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#3166F0]"
                  />
                  <button
                    type="button"
                    disabled={!hasName || revealed}
                    onClick={() => {
                      onSave(draft);
                      onReveal(field.id);
                    }}
                    className="rounded-xl border border-[#3166F0]/30 bg-[#3166F0]/10 px-3 py-2 text-xs font-semibold text-[#9eb6ff] transition hover:bg-[#3166F0]/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {revealed ? 'Показано' : 'Показать победителя'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-[#3166F0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2858d4]"
            >
              Сохранить
            </button>
            {savedMessage && (
              <p className="text-sm text-emerald-400">Результаты сохранены</p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
