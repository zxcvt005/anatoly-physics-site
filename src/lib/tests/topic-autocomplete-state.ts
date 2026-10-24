import type { LessonTopic } from '@/types/tests';

/** Search by the topic title even when the field shows "Раздел → Тема". */
export function getTopicSearchNeedle(query: string): string {
  const trimmed = query.trim();
  const separatorIndex = trimmed.lastIndexOf('→');
  if (separatorIndex === -1) return trimmed;
  return trimmed.slice(separatorIndex + 1).trim() || trimmed;
}

export function formatTopicOptionLabel(topic: LessonTopic): string {
  return topic.sectionTitle
    ? `${topic.sectionTitle} → ${topic.title}`
    : topic.title;
}

/**
 * Hydrate the saved topic only from an external value change.
 * Do not re-apply it while the teacher is editing the field.
 */
export function shouldApplyHydratedTopic(input: {
  requestedValue?: string;
  selectedId?: string;
  userEdited: boolean;
}): boolean {
  if (input.userEdited) return false;
  if (!input.requestedValue) return false;
  return input.selectedId !== input.requestedValue;
}
