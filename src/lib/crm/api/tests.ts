import { crmApiDelete, crmApiGet, crmApiPatch, crmApiPost, crmApiPut } from '@/lib/crm/api/http';
import type {
  LessonTopic,
  SaveTestInput,
  TestEditorBundle,
  TopicTestStats,
} from '@/types/tests';

export function fetchLessonTopics() {
  return crmApiGet<LessonTopic[]>('/api/crm/tests/topics');
}

export function searchLessonTopics(query: string) {
  return crmApiGet<LessonTopic[]>(
    `/api/crm/tests/topics?q=${encodeURIComponent(query)}`,
  );
}

export function createLessonTopic(title: string) {
  return crmApiPost<LessonTopic>('/api/crm/tests/topics', { title });
}

export function reorderLessonTopics(orderedIds: string[]) {
  return crmApiPost<LessonTopic[]>('/api/crm/tests/topics', { orderedIds });
}

export function updateLessonTopicTitle(topicId: string, title: string) {
  return crmApiPatch<LessonTopic>(`/api/crm/tests/topics/${topicId}`, { title });
}

export function archiveLessonTopic(topicId: string) {
  return crmApiDelete<null>(`/api/crm/tests/topics/${topicId}`);
}

export function fetchHomeworkTestByTopic(topicId: string) {
  return crmApiGet<TestEditorBundle | null>(`/api/crm/tests/topics/${topicId}`);
}

export function saveHomeworkTestByTopic(topicId: string, test: SaveTestInput) {
  return crmApiPut<TestEditorBundle>(`/api/crm/tests/topics/${topicId}`, { test });
}

export function fetchTopicTestStats(topicId: string) {
  return crmApiGet<TopicTestStats>(`/api/crm/tests/topics/${topicId}?view=stats`);
}

export function fetchIntensiveTest(intensiveId: string) {
  return crmApiGet<TestEditorBundle | null>(
    `/api/crm/tests/intensives/${intensiveId}`,
  );
}

export function saveIntensiveTest(intensiveId: string, test: SaveTestInput) {
  return crmApiPut<TestEditorBundle>(`/api/crm/tests/intensives/${intensiveId}`, {
    test,
  });
}

export function fetchIntensiveTestStats(intensiveId: string) {
  return crmApiGet<TopicTestStats>(
    `/api/crm/tests/intensives/${intensiveId}?view=stats`,
  );
}

export function createLessonHomeworkAssignment(input: {
  studentId: string;
  lessonId: string;
  topicId: string;
}) {
  return crmApiPost<null>('/api/crm/tests/assignments', input);
}
