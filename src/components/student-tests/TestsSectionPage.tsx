'use client';

import { useEffect, useMemo } from 'react';
import { useTestsData } from '@/components/student-tests/TestsDataProvider';
import { HomeworkTestCard } from '@/components/student-tests/HomeworkTestCard';
import { groupHomeworkBySection } from '@/lib/tests/topic-sections';
import { isDismissedHomeworkItem } from '@/lib/tests/student-homework-stats';
import { slugToSectionId } from '@/lib/tests/student-navigation';

type TestsSectionPageProps = {
  sectionSlug: string;
};

export function TestsSectionPage({ sectionSlug }: TestsSectionPageProps) {
  const { token, homework, loading, loadError } = useTestsData();
  const sectionId = slugToSectionId(sectionSlug);

  const sectionGroup = useMemo(() => {
    const groups = groupHomeworkBySection(homework);
    return groups.find((group) => (group.sectionId ?? null) === sectionId) ?? null;
  }, [homework, sectionId]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const element = document.querySelector(hash);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [sectionGroup]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Загрузка...</p>;
  }

  if (loadError) {
    return <p className="text-sm text-red-400">{loadError}</p>;
  }

  if (!sectionGroup) {
    return <p className="text-sm text-zinc-500">Раздел не найден</p>;
  }

  const hasAssigned = sectionGroup.items.some(
    (item) =>
      item.source === 'lesson' &&
      item.status !== 'completed' &&
      !isDismissedHomeworkItem(item),
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-3 text-sm uppercase tracking-[0.35em] text-zinc-400">
          Раздел
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">{sectionGroup.sectionTitle}</h1>
          {hasAssigned && (
            <span className="rounded-full border border-[#3166F0]/40 bg-[#3166F0]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#9eb6ff]">
              Есть назначенное
            </span>
          )}
        </div>
        <p className="mt-3 max-w-2xl text-base text-zinc-400">
          {sectionGroup.items.length}{' '}
          {sectionGroup.items.length === 1 ? 'тест' : 'тестов'} в этом разделе
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {sectionGroup.items.map((item) => (
          <HomeworkTestCard key={item.topicId} token={token} item={item} />
        ))}
      </div>
    </div>
  );
}
