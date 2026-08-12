'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChevronRight, Plus, X, Zap } from 'lucide-react';
import { TestEditorPanel } from '@/components/tutor/TestEditorPanel';
import { TestStatsPanel } from '@/components/tutor/TestStatsPanel';
import {
  archiveLessonTopic,
  createLessonTopic,
  fetchHomeworkTestByTopic,
  fetchIntensiveTest,
  fetchLessonTopics,
  reorderLessonTopics,
  updateLessonTopicTitle,
} from '@/lib/crm/api/tests';
import { crmApiGet } from '@/lib/crm/api/http';
import type { Intensive } from '@/types/tutor';
import type { LessonTopic, TestEditorBundle } from '@/types/tests';

type TestsTab = 'lessons' | 'intensives';
type LessonView = 'list' | 'editor' | 'stats';

export function TestsCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TestsTab>('lessons');
  const [topics, setTopics] = useState<LessonTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [lessonView, setLessonView] = useState<LessonView>('list');
  const [selectedTopic, setSelectedTopic] = useState<LessonTopic | null>(null);
  const [selectedIntensiveId, setSelectedIntensiveId] = useState<string | null>(null);
  const [testBundle, setTestBundle] = useState<TestEditorBundle | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [intensives, setIntensives] = useState<Intensive[]>([]);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    const result = await fetchLessonTopics();
    setLoading(false);
    if (result.ok) setTopics(result.data);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadTopics();
    void crmApiGet<{ intensives: Intensive[]; progress: unknown[] }>(
      '/api/crm/intensives',
    ).then((result) => {
      if (result.ok) setIntensives(result.data.intensives);
    });
  }, [open, loadTopics]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const openTopicEditor = async (topic: LessonTopic, view: LessonView) => {
    setSelectedTopic(topic);
    setLessonView(view);
    const result = await fetchHomeworkTestByTopic(topic.id);
    if (result.ok) {
      setTestBundle(
        result.data ?? {
          test: {
            id: '',
            testType: 'homework',
            title: topic.title,
            lessonTopicId: topic.id,
            version: 1,
            isActive: true,
            isPublished: false,
            questionCount: 0,
            maxPoints: 0,
          },
          questions: [],
        },
      );
    }
  };

  const handleCreateTopic = async () => {
    const result = await createLessonTopic(newTopicTitle);
    if (result.ok) {
      setNewTopicTitle('');
      await loadTopics();
    }
  };

  const handleMoveTopic = async (topicId: string, direction: -1 | 1) => {
    const index = topics.findIndex((topic) => topic.id === topicId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= topics.length) return;

    const ordered = [...topics];
    const [item] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, item);
    setTopics(ordered);
    await reorderLessonTopics(ordered.map((topic) => topic.id));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
      >
        <BookOpen className="h-4 w-4" />
        Тесты
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Тесты</h2>
            <p className="text-sm text-zinc-500">Домашние задания и интенсивы</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-zinc-700 p-2 text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex gap-2 border-b border-zinc-800 px-4 py-3 sm:px-6">
          <TabButton active={tab === 'lessons'} onClick={() => setTab('lessons')}>
            Уроки
          </TabButton>
          <TabButton active={tab === 'intensives'} onClick={() => setTab('intensives')}>
            Интенсивы
          </TabButton>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4 sm:px-6">
          {tab === 'lessons' && lessonView === 'list' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={newTopicTitle}
                  onChange={(event) => setNewTopicTitle(event.target.value)}
                  placeholder="Новая тема урока"
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateTopic()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3166F0] px-4 py-2 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Создать тему
                </button>
              </div>

              {loading && <p className="text-sm text-zinc-500">Загрузка...</p>}

              <div className="space-y-2">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-white">{topic.title}</p>
                        <p className="text-xs text-zinc-500">Тема урока</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleMoveTopic(topic.id, -1)}
                          className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleMoveTopic(topic.id, 1)}
                          className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => void openTopicEditor(topic, 'editor')}
                          className="rounded-lg bg-[#3166F0] px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Редактор теста
                        </button>
                        <button
                          type="button"
                          onClick={() => void openTopicEditor(topic, 'stats')}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200"
                        >
                          Статистика
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = prompt('Новое название темы', topic.title);
                            if (next) {
                              void updateLessonTopicTitle(topic.id, next).then(() =>
                                loadTopics(),
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
                                'Архивировать тему? Исторические результаты сохранятся.',
                              )
                            ) {
                              void archiveLessonTopic(topic.id).then(() => loadTopics());
                            }
                          }}
                          className="rounded-lg border border-red-900/40 px-3 py-1.5 text-xs text-red-300"
                        >
                          Архив
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'lessons' && lessonView !== 'list' && selectedTopic && (
            <>
              <button
                type="button"
                onClick={() => {
                  setLessonView('list');
                  setSelectedTopic(null);
                  setTestBundle(null);
                }}
                className="mb-4 text-sm text-zinc-400 hover:text-white"
              >
                ← К списку тем
              </button>
              {lessonView === 'editor' && testBundle && (
                <TestEditorPanel
                  mode="homework"
                  topicId={selectedTopic.id}
                  initial={testBundle}
                  onSaved={setTestBundle}
                />
              )}
              {lessonView === 'stats' && (
                <TestStatsPanel mode="homework" entityId={selectedTopic.id} title={selectedTopic.title} />
              )}
            </>
          )}

          {tab === 'intensives' && !selectedIntensiveId && (
            <div className="space-y-2">
              {intensives.map((intensive) => (
                <button
                  key={intensive.id}
                  type="button"
                  onClick={() => setSelectedIntensiveId(intensive.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-left transition hover:border-[#3166F0]/40"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-[#3166F0]" />
                    <span className="font-medium text-white">{intensive.title}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-500" />
                </button>
              ))}
            </div>
          )}

          {tab === 'intensives' && selectedIntensiveId && (
            <>
              <button
                type="button"
                onClick={() => setSelectedIntensiveId(null)}
                className="mb-4 text-sm text-zinc-400 hover:text-white"
              >
                ← К списку интенсивов
              </button>
              <IntensiveTestManager intensiveId={selectedIntensiveId} intensives={intensives} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IntensiveTestManager({
  intensiveId,
  intensives,
}: {
  intensiveId: string;
  intensives: Intensive[];
}) {
  const intensive = intensives.find((item) => item.id === intensiveId);
  const [view, setView] = useState<'editor' | 'stats'>('editor');
  const [bundle, setBundle] = useState<TestEditorBundle | null>(null);

  useEffect(() => {
    void fetchIntensiveTest(intensiveId).then((result) => {
      if (result.ok) {
        setBundle(
          result.data ?? {
            test: {
              id: '',
              testType: 'intensive',
              title: intensive?.title ?? 'Интенсив',
              intensiveId,
              version: 1,
              isActive: true,
              isPublished: false,
              questionCount: 0,
              maxPoints: 0,
            },
            questions: [],
          },
        );
      }
    });
  }, [intensiveId, intensive?.title]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <TabButton active={view === 'editor'} onClick={() => setView('editor')}>
          Редактор
        </TabButton>
        <TabButton active={view === 'stats'} onClick={() => setView('stats')}>
          Статистика
        </TabButton>
      </div>
      {view === 'editor' && bundle && (
        <TestEditorPanel
          mode="intensive"
          intensiveId={intensiveId}
          initial={bundle}
          onSaved={setBundle}
        />
      )}
      {view === 'stats' && (
        <TestStatsPanel
          mode="intensive"
          entityId={intensiveId}
          title={intensive?.title ?? 'Интенсив'}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-[#3166F0] text-white'
          : 'border border-zinc-700 text-zinc-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
