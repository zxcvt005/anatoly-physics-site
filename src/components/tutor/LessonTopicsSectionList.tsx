'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import {
  archiveLessonTopic,
  archiveLessonTopicSection,
  createLessonTopic,
  createLessonTopicSection,
  reorderLessonTopicSections,
  reorderLessonTopics,
  updateLessonTopicSection,
  updateLessonTopicSectionTitle,
  updateLessonTopicTitle,
} from '@/lib/crm/api/tests';
import { groupTopicsBySection, UNSECTIONED_GROUP_LABEL } from '@/lib/tests/topic-sections';
import type { LessonTopic, LessonTopicSection } from '@/types/tests';

interface LessonTopicsSectionListProps {
  sections: LessonTopicSection[];
  topics: LessonTopic[];
  loading: boolean;
  onReload: () => Promise<void>;
  onTopicsChange: (topics: LessonTopic[]) => void;
  onSectionsChange: (sections: LessonTopicSection[]) => void;
  onOpenTopic: (topic: LessonTopic, view: 'editor' | 'stats') => void;
}

export function LessonTopicsSectionList({
  sections,
  topics,
  loading,
  onReload,
  onTopicsChange,
  onSectionsChange,
  onOpenTopic,
}: LessonTopicsSectionListProps) {
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicSectionId, setNewTopicSectionId] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => groupTopicsBySection(sections, topics),
    [sections, topics],
  );

  const sectionOptions = useMemo(
    () => [
      { id: '', label: UNSECTIONED_GROUP_LABEL },
      ...sections.map((section) => ({ id: section.id, label: section.title })),
    ],
    [sections],
  );

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCreateSection = async () => {
    const result = await createLessonTopicSection(newSectionTitle);
    if (result.ok) {
      setNewSectionTitle('');
      await onReload();
    }
  };

  const handleCreateTopic = async (sectionId: string | null, title?: string) => {
    const value = (title ?? newTopicTitle).trim();
    if (!value) return;

    const result = await createLessonTopic(value, sectionId);
    if (result.ok) {
      if (!title) setNewTopicTitle('');
      await onReload();
    }
  };

  const handleMoveSection = async (sectionId: string, direction: -1 | 1) => {
    const ordered = [...sections];
    const index = ordered.findIndex((section) => section.id === sectionId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ordered.length) return;

    const next = [...ordered];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onSectionsChange(next);
    const result = await reorderLessonTopicSections(next.map((section) => section.id));
    if (result.ok) onSectionsChange(result.data);
  };

  const handleMoveTopic = async (
    sectionId: string | null,
    topicId: string,
    direction: -1 | 1,
  ) => {
    const sectionTopics = topics
      .filter((topic) => (topic.sectionId ?? null) === sectionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const index = sectionTopics.findIndex((topic) => topic.id === topicId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sectionTopics.length) return;

    const ordered = [...sectionTopics];
    const [item] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, item);

    const orderedIds = ordered.map((topic) => topic.id);
    const otherTopics = topics.filter(
      (topic) => (topic.sectionId ?? null) !== sectionId,
    );
    const nextTopics = [
      ...otherTopics,
      ...ordered.map((topic, sortIndex) => ({ ...topic, sortOrder: sortIndex })),
    ];
    onTopicsChange(nextTopics);

    const result = await reorderLessonTopics(orderedIds);
    if (result.ok) onTopicsChange(result.data);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={newSectionTitle}
          onChange={(event) => setNewSectionTitle(event.target.value)}
          placeholder="Название нового раздела"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
        />
        <button
          type="button"
          onClick={() => void handleCreateSection()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Создать раздел
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 sm:flex-row">
        <input
          value={newTopicTitle}
          onChange={(event) => setNewTopicTitle(event.target.value)}
          placeholder="Новая тема урока"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
        />
        <select
          value={newTopicSectionId}
          onChange={(event) => setNewTopicSectionId(event.target.value)}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
        >
          {sectionOptions.map((option) => (
            <option key={option.id || '__none'} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            void handleCreateTopic(newTopicSectionId || null)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3166F0] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Создать тему
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-500">Загрузка...</p>}

      <div className="space-y-3">
        {groups.map((group) => {
          const groupKey = group.sectionId ?? '__unsectioned__';
          const isCollapsed = collapsedSections.has(groupKey);
          const isUnsectioned = group.sectionId === null;

          return (
            <div
              key={groupKey}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
            >
              <div className="flex flex-col gap-3 border-b border-zinc-800/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => toggleSection(groupKey)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-500 transition ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{group.sectionTitle}</p>
                    <p className="text-xs text-zinc-500">
                      {group.topics.length}{' '}
                      {group.topics.length === 1 ? 'тема' : 'тем'}
                    </p>
                  </div>
                </button>

                {!isUnsectioned && group.sectionId && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleMoveSection(group.sectionId!, -1)}
                      className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMoveSection(group.sectionId!, 1)}
                      className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = prompt(
                          'Новое название раздела',
                          group.sectionTitle,
                        );
                        if (next) {
                          void updateLessonTopicSectionTitle(group.sectionId!, next).then(
                            () => onReload(),
                          );
                        }
                      }}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200"
                    >
                      Переименовать
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            'Удалить раздел? Темы будут перенесены в «Без раздела».',
                          )
                        ) {
                          void archiveLessonTopicSection(group.sectionId!).then(() =>
                            onReload(),
                          );
                        }
                      }}
                      className="rounded-lg border border-red-900/40 px-3 py-1.5 text-xs text-red-300"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="space-y-2 p-3">
                  {group.topics.map((topic) => (
                    <TopicRow
                      key={topic.id}
                      topic={topic}
                      sectionOptions={sectionOptions}
                      onMove={(direction) =>
                        void handleMoveTopic(group.sectionId, topic.id, direction)
                      }
                      onOpenEditor={() => onOpenTopic(topic, 'editor')}
                      onOpenStats={() => onOpenTopic(topic, 'stats')}
                      onRename={() => {
                        const next = prompt('Новое название темы', topic.title);
                        if (next) {
                          void updateLessonTopicTitle(topic.id, next).then(() => onReload());
                        }
                      }}
                      onChangeSection={(sectionId) => {
                        void updateLessonTopicSection(topic.id, sectionId).then(() =>
                          onReload(),
                        );
                      }}
                      onArchive={() => {
                        if (
                          confirm(
                            'Архивировать тему? Исторические результаты сохранятся.',
                          )
                        ) {
                          void archiveLessonTopic(topic.id).then(() => onReload());
                        }
                      }}
                    />
                  ))}

                  {!isUnsectioned && group.sectionId && (
                    <button
                      type="button"
                      onClick={() => {
                        const title = prompt('Название новой темы');
                        if (title) {
                          void handleCreateTopic(group.sectionId, title);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:border-[#3166F0]/40 hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Добавить тему
                    </button>
                  )}

                  {group.topics.length === 0 && isUnsectioned && (
                    <p className="px-1 py-2 text-sm text-zinc-500">
                      Темы без раздела появятся здесь.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopicRow({
  topic,
  sectionOptions,
  onMove,
  onOpenEditor,
  onOpenStats,
  onRename,
  onChangeSection,
  onArchive,
}: {
  topic: LessonTopic;
  sectionOptions: Array<{ id: string; label: string }>;
  onMove: (direction: -1 | 1) => void;
  onOpenEditor: () => void;
  onOpenStats: () => void;
  onRename: () => void;
  onChangeSection: (sectionId: string | null) => void;
  onArchive: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{topic.title}</p>
          <label className="mt-2 block text-xs text-zinc-500">
            Раздел
            <select
              value={topic.sectionId ?? ''}
              onChange={(event) =>
                onChangeSection(event.target.value ? event.target.value : null)
              }
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none focus:border-[#3166F0]"
            >
              {sectionOptions.map((option) => (
                <option key={option.id || '__none'} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onMove(-1)}
            className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onOpenEditor}
            className="rounded-lg bg-[#3166F0] px-3 py-1.5 text-xs font-medium text-white"
          >
            Редактор теста
          </button>
          <button
            type="button"
            onClick={onOpenStats}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200"
          >
            Статистика
          </button>
          <button
            type="button"
            onClick={onRename}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200"
          >
            Переименовать
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="rounded-lg border border-red-900/40 px-3 py-1.5 text-xs text-red-300"
          >
            Архив
          </button>
        </div>
      </div>
    </div>
  );
}
