import assert from 'node:assert/strict';
import {
  groupHomeworkBySection,
  groupTopicsBySection,
  UNSECTIONED_GROUP_LABEL,
} from '../src/lib/tests/topic-sections';
import type { LessonTopic, LessonTopicSection } from '../src/types/tests';

function testGroupTopicsBySection() {
  const sections: LessonTopicSection[] = [
    { id: 'sec-b', title: 'Раздел B', sortOrder: 1, isActive: true },
    { id: 'sec-a', title: 'Раздел A', sortOrder: 0, isActive: true },
  ];

  const topics: LessonTopic[] = [
    { id: 't1', title: 'Тема 1', sortOrder: 0, isActive: true, sectionId: 'sec-a' },
    { id: 't2', title: 'Тема 2', sortOrder: 1, isActive: true, sectionId: 'sec-a' },
    { id: 't3', title: 'Тема 3', sortOrder: 0, isActive: true, sectionId: 'sec-b' },
    { id: 't4', title: 'Без раздела', sortOrder: 0, isActive: true, sectionId: null },
  ];

  const groups = groupTopicsBySection(sections, topics);

  assert.equal(groups.length, 3);
  assert.equal(groups[0].sectionTitle, 'Раздел A');
  assert.deepEqual(
    groups[0].topics.map((topic) => topic.id),
    ['t1', 't2'],
  );
  assert.equal(groups[1].sectionTitle, 'Раздел B');
  assert.equal(groups[2].sectionTitle, UNSECTIONED_GROUP_LABEL);
  assert.deepEqual(groups[2].topics.map((topic) => topic.id), ['t4']);
}

function testGroupHomeworkBySection() {
  const items = [
    {
      topicId: 't1',
      topicTitle: 'A1',
      sectionId: 'sec-a',
      sectionTitle: 'Раздел A',
      sectionSortOrder: 0,
    },
    {
      topicId: 't2',
      topicTitle: 'B1',
      sectionId: 'sec-b',
      sectionTitle: 'Раздел B',
      sectionSortOrder: 1,
    },
    {
      topicId: 't3',
      topicTitle: 'U1',
      sectionId: null,
      sectionTitle: undefined,
      sectionSortOrder: undefined,
    },
  ];

  const groups = groupHomeworkBySection(items);

  assert.equal(groups.length, 3);
  assert.equal(groups[0].sectionTitle, 'Раздел A');
  assert.equal(groups[1].sectionTitle, 'Раздел B');
  assert.equal(groups[2].sectionTitle, UNSECTIONED_GROUP_LABEL);
}

function testExistingTopicsStayUnsectioned() {
  const legacyTopics: LessonTopic[] = [
    { id: 'legacy-1', title: 'Старая тема', sortOrder: 0, isActive: true },
  ];

  const groups = groupTopicsBySection([], legacyTopics);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].sectionId, null);
  assert.equal(groups[0].topics[0].id, 'legacy-1');
}

function runLessonTopicSectionChecks() {
  testGroupTopicsBySection();
  testGroupHomeworkBySection();
  testExistingTopicsStayUnsectioned();
  console.log('verify:lesson-topic-sections OK');
}

runLessonTopicSectionChecks();
