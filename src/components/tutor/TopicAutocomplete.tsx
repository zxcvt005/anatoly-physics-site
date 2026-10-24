'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { searchLessonTopics } from '@/lib/crm/api/tests';
import { groupTopicsBySection, UNSECTIONED_GROUP_LABEL } from '@/lib/tests/topic-sections';
import {
  formatTopicOptionLabel,
  getTopicSearchNeedle,
  shouldApplyHydratedTopic,
} from '@/lib/tests/topic-autocomplete-state';
import type { LessonTopic, LessonTopicSection } from '@/types/tests';

interface TopicAutocompleteProps {
  value?: string;
  initialLabel?: string;
  onChange: (topic: LessonTopic | null) => void;
  disabled?: boolean;
}

function buildSectionList(topics: LessonTopic[]): LessonTopicSection[] {
  const sections = new Map<string, LessonTopicSection>();

  for (const topic of topics) {
    if (!topic.sectionId || !topic.sectionTitle) continue;
    if (sections.has(topic.sectionId)) continue;
    sections.set(topic.sectionId, {
      id: topic.sectionId,
      title: topic.sectionTitle,
      sortOrder: topic.sectionSortOrder ?? 0,
      isActive: true,
    });
  }

  return [...sections.values()];
}

export function TopicAutocomplete({
  value,
  initialLabel,
  onChange,
  disabled,
}: TopicAutocompleteProps) {
  const listboxId = useId();
  const [query, setQuery] = useState(initialLabel ?? '');
  const [options, setOptions] = useState<LessonTopic[]>([]);
  const [selected, setSelected] = useState<LessonTopic | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const userEditedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const selectedIdRef = useRef<string | undefined>(undefined);
  const valueRef = useRef(value);

  onChangeRef.current = onChange;
  selectedIdRef.current = selected?.id;

  if (valueRef.current !== value) {
    userEditedRef.current = false;
    valueRef.current = value;
  }

  useEffect(() => {
    if (!value) {
      if (!userEditedRef.current) {
        setSelected(null);
        setQuery(initialLabel ?? '');
      }
      return;
    }

    let cancelled = false;
    void searchLessonTopics('').then((result) => {
      if (cancelled || !result.ok) return;
      if (
        !shouldApplyHydratedTopic({
          requestedValue: value,
          selectedId: selectedIdRef.current,
          userEdited: userEditedRef.current,
        })
      ) {
        return;
      }

      const match = result.data.find((topic) => topic.id === value) ?? null;
      if (!match) return;

      setSelected(match);
      setQuery(formatTopicOptionLabel(match));
      onChangeRef.current(match);
    });

    return () => {
      cancelled = true;
    };
  }, [value, initialLabel]);

  const searchNeedle = getTopicSearchNeedle(query);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchLessonTopics(searchNeedle).then((result) => {
        if (cancelled) return;
        setLoading(false);
        if (result.ok) setOptions(result.data);
      });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchNeedle, open]);

  const groupedOptions = useMemo(() => {
    const normalized = searchNeedle.toLowerCase();
    const filtered = normalized
      ? options.filter((topic) => topic.title.toLowerCase().includes(normalized))
      : options;

    return groupTopicsBySection(buildSectionList(filtered), filtered).flatMap((group) =>
      group.topics.map((topic) => ({
        topic,
        sectionTitle: group.sectionTitle,
      })),
    );
  }, [options, searchNeedle]);

  const visibleOptions = groupedOptions.slice(0, 12);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          userEditedRef.current = true;
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
          {visibleOptions.map(({ topic, sectionTitle }) => (
            <li key={topic.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-800"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  userEditedRef.current = true;
                  setSelected(topic);
                  setQuery(
                    sectionTitle && sectionTitle !== UNSECTIONED_GROUP_LABEL
                      ? `${sectionTitle} → ${topic.title}`
                      : topic.title,
                  );
                  onChange(topic);
                  setOpen(false);
                }}
              >
                {sectionTitle && sectionTitle !== UNSECTIONED_GROUP_LABEL ? (
                  <>
                    <span className="block text-[11px] uppercase tracking-wide text-zinc-500">
                      {sectionTitle}
                    </span>
                    <span className="block text-sm text-zinc-200">{topic.title}</span>
                  </>
                ) : (
                  <span className="block text-sm text-zinc-200">{topic.title}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
