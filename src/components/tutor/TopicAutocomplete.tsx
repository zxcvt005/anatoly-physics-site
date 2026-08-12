'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { searchLessonTopics } from '@/lib/crm/api/tests';
import type { LessonTopic } from '@/types/tests';

interface TopicAutocompleteProps {
  value?: string;
  onChange: (topic: LessonTopic | null) => void;
  disabled?: boolean;
}

export function TopicAutocomplete({ value, onChange, disabled }: TopicAutocompleteProps) {
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<LessonTopic[]>([]);
  const [selected, setSelected] = useState<LessonTopic | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }

    if (selected?.id === value) return;

    let cancelled = false;
    void searchLessonTopics('').then((result) => {
      if (cancelled || !result.ok) return;
      const match = result.data.find((topic) => topic.id === value) ?? null;
      setSelected(match);
      if (match) setQuery(match.title);
    });

    return () => {
      cancelled = true;
    };
  }, [value, selected?.id]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchLessonTopics(query).then((result) => {
        if (cancelled) return;
        setLoading(false);
        if (result.ok) setOptions(result.data);
      });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const visibleOptions = useMemo(() => options.slice(0, 8), [options]);

  return (
    <div className="relative">
      <input
        type="text"
        value={selected ? selected.title : query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(null);
          onChange(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder="Начните вводить тему..."
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
        aria-autocomplete="list"
        aria-controls={listboxId}
      />

      {open && (
        <ul
          id={listboxId}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-zinc-500">Поиск...</li>
          )}
          {!loading && visibleOptions.length === 0 && (
            <li className="px-3 py-2 text-sm text-zinc-500">Темы не найдены</li>
          )}
          {visibleOptions.map((topic) => (
            <li key={topic.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setSelected(topic);
                  setQuery(topic.title);
                  onChange(topic);
                  setOpen(false);
                }}
              >
                {topic.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
