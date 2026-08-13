import type { LessonTopic, LessonTopicSection } from '@/types/tests';

export const UNSECTIONED_GROUP_LABEL = 'Без раздела';

export interface TopicSectionGroup {
  sectionId: string | null;
  sectionTitle: string;
  sectionSortOrder: number;
  topics: LessonTopic[];
}

export function groupTopicsBySection(
  sections: LessonTopicSection[],
  topics: LessonTopic[],
): TopicSectionGroup[] {
  const sectionMap = new Map<string, LessonTopicSection>();
  for (const section of sections) {
    sectionMap.set(section.id, section);
  }

  const buckets = new Map<string | null, LessonTopic[]>();

  for (const topic of topics) {
    const key = topic.sectionId ?? null;
    const list = buckets.get(key) ?? [];
    list.push(topic);
    buckets.set(key, list);
  }

  const groups: TopicSectionGroup[] = [];

  for (const section of [...sections].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const sectionTopics = (buckets.get(section.id) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    groups.push({
      sectionId: section.id,
      sectionTitle: section.title,
      sectionSortOrder: section.sortOrder,
      topics: sectionTopics,
    });
    buckets.delete(section.id);
  }

  const unsectioned = (buckets.get(null) ?? []).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  if (unsectioned.length > 0) {
    groups.push({
      sectionId: null,
      sectionTitle: UNSECTIONED_GROUP_LABEL,
      sectionSortOrder: Number.MAX_SAFE_INTEGER,
      topics: unsectioned,
    });
  }

  return groups;
}

export function groupHomeworkBySection<
  T extends { sectionId?: string | null; sectionTitle?: string; sectionSortOrder?: number },
>(items: T[]): Array<{ sectionId: string | null; sectionTitle: string; items: T[] }> {
  const groups = new Map<
    string,
    { sectionId: string | null; sectionTitle: string; sectionSortOrder: number; items: T[] }
  >();

  for (const item of items) {
    const sectionId = item.sectionId ?? null;
    const key = sectionId ?? '__unsectioned__';
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      sectionId,
      sectionTitle: item.sectionTitle ?? UNSECTIONED_GROUP_LABEL,
      sectionSortOrder: item.sectionSortOrder ?? Number.MAX_SAFE_INTEGER,
      items: [item],
    });
  }

  return [...groups.values()]
    .sort((a, b) => a.sectionSortOrder - b.sectionSortOrder)
    .map(({ sectionId, sectionTitle, items: groupItems }) => ({
      sectionId,
      sectionTitle,
      items: groupItems,
    }));
}
