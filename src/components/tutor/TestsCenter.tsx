'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { LessonTopicsSectionList } from '@/components/tutor/LessonTopicsSectionList';
import { TestEditorPanel } from '@/components/tutor/TestEditorPanel';
import { TestStatsPanel } from '@/components/tutor/TestStatsPanel';
import {
  fetchHomeworkTestByTopic,
  fetchLessonTopics,
  fetchLessonTopicSections,
} from '@/lib/crm/api/tests';
import type { LessonTopic, LessonTopicSection, TestEditorBundle } from '@/types/tests';

type LessonView = 'list' | 'editor' | 'stats';

export function TestsCenter() {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<LessonTopic[]>([]);
  const [sections, setSections] = useState<LessonTopicSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [lessonView, setLessonView] = useState<LessonView>('list');
  const [selectedTopic, setSelectedTopic] = useState<LessonTopic | null>(null);
  const [testBundle, setTestBundle] = useState<TestEditorBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  const loadLessonData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const errors: string[] = [];

    try {
      await Promise.all([
        fetchLessonTopics().then((result) => {
          if (result.ok) {
            setTopics(result.data);
            return;
          }
          errors.push(result.error);
        }),
        fetchLessonTopicSections().then((result) => {
          if (result.ok) {
            setSections(result.data);
            return;
          }
          errors.push(result.error);
        }),
      ]);
    } finally {
      setLoading(false);
      if (errors.length > 0) {
        setLoadError(errors.join(' · '));
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadLessonData();
  }, [open, loadLessonData]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const closeLessonEditor = () => {
    setLessonView('list');
    setSelectedTopic(null);
    setTestBundle(null);
    void loadLessonData();
  };

  const emptyBundleForTopic = (topic: LessonTopic): TestEditorBundle => ({
    test: {
      id: '',
      testType: 'homework',
      title: topic.title,
      lessonTopicId: topic.id,
      version: 1,
      isActive: true,
      isPublished: true,
      questionCount: 0,
      maxPoints: 0,
    },
    questions: [],
  });

  const openTopicEditor = async (topic: LessonTopic, view: LessonView) => {
    setSelectedTopic(topic);
    setLessonView(view);
    setEditorError(null);

    const result = await fetchHomeworkTestByTopic(topic.id);
    if (result.ok) {
      setTestBundle(result.data ?? emptyBundleForTopic(topic));
      return;
    }

    setEditorError(result.error);
    setTestBundle(emptyBundleForTopic(topic));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3166F0]/50 hover:text-white"
      >
        <BookOpen className="h-4 w-4 text-[#6B93FF]" />
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
            <p className="text-sm text-zinc-500">Разделы, темы и задания</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-zinc-700 p-2 text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto px-4 py-4 sm:px-6">
          {loadError && (
            <p className="mb-4 text-sm text-red-300" role="alert">
              {loadError}
            </p>
          )}
          {lessonView === 'list' && (
            <LessonTopicsSectionList
              sections={sections}
              topics={topics}
              loading={loading}
              onReload={loadLessonData}
              onTopicsChange={setTopics}
              onSectionsChange={setSections}
              onOpenTopic={(topic, view) => void openTopicEditor(topic, view)}
            />
          )}

          {lessonView !== 'list' && selectedTopic && (
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
              {editorError && (
                <p className="mb-4 text-sm text-red-300" role="alert">
                  {editorError}
                </p>
              )}
              {lessonView === 'editor' && testBundle && (
                <TestEditorPanel
                  key={`${selectedTopic.id}-${testBundle.test.id}-${testBundle.test.version}-${testBundle.questions.length}`}
                  topicId={selectedTopic.id}
                  initial={testBundle}
                  onSaved={setTestBundle}
                  onSaveSuccess={closeLessonEditor}
                  onTestRemoved={closeLessonEditor}
                />
              )}
              {lessonView === 'stats' && (
                <TestStatsPanel entityId={selectedTopic.id} title={selectedTopic.title} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
