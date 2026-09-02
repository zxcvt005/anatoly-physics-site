export type TestType = 'homework' | 'intensive';

export type TestQuestionType =
  | 'numeric'
  | 'short_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'matching';

export type TestAssignmentStatus = 'assigned' | 'in_progress' | 'completed';

export type TestAssignmentSource = 'lesson' | 'self';

export type TestAttemptStage = 'draft_1' | 'graded_1' | 'draft_2' | 'completed';

export interface LessonTopicSection {
  id: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
}

export interface LessonTopic {
  id: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
  sectionId?: string | null;
  /** Заполняется при join с разделом — для отображения в UI */
  sectionTitle?: string;
  sectionSortOrder?: number;
}

export interface TestSummary {
  id: string;
  testType: TestType;
  title: string;
  lessonTopicId?: string;
  intensiveId?: string;
  version: number;
  isActive: boolean;
  isPublished: boolean;
  questionCount: number;
  maxPoints: number;
}

export interface TestQuestionOption {
  id: string;
  sortOrder: number;
  labelText: string;
  /** Только для CRM-редактора; не отдавать ученику */
  isCorrect?: boolean;
  matchKey?: string;
}

export interface NumericQuestionConfig {
  correctValue: number;
  tolerance?: number;
}

export interface ShortTextQuestionConfig {
  acceptedAnswers: string[];
  caseInsensitive?: boolean;
}

export interface TestQuestion {
  id: string;
  sortOrder: number;
  questionType: TestQuestionType;
  promptText: string;
  imageUrl?: string;
  maxPoints: number;
  config: NumericQuestionConfig | ShortTextQuestionConfig | Record<string, never>;
  options: TestQuestionOption[];
}

export interface TestEditorBundle {
  test: TestSummary;
  questions: TestQuestion[];
}

/** Публичный вопрос для ученика — без answer key */
export interface StudentTestQuestion {
  id: string;
  sortOrder: number;
  questionType: TestQuestionType;
  promptText: string;
  imageUrl?: string;
  maxPoints: number;
  options: Array<{
    id: string;
    sortOrder: number;
    labelText: string;
    matchKey?: string;
  }>;
}

export interface TestAssignment {
  id: string;
  testId: string;
  studentId: string;
  lessonId?: string;
  status: TestAssignmentStatus;
  source: TestAssignmentSource;
  dismissedAt?: string;
  createdAt: string;
}

export interface TestAttemptSummary {
  id: string;
  testId: string;
  testVersion: number;
  studentId: string;
  assignmentId?: string;
  stage: TestAttemptStage;
  firstAttemptCorrect?: number;
  firstAttemptTotal?: number;
  secondAttemptFixed?: number;
  secondAttemptUnknown?: number;
  finalScore?: number;
  finalMaxScore?: number;
  finalPercent?: number;
  completedAt?: string;
  createdAt: string;
}

export type StudentAnswerValue =
  | { type: 'numeric'; value: string }
  | { type: 'short_text'; value: string }
  | { type: 'single_choice'; optionId: string }
  | { type: 'multiple_choice'; optionIds: string[] }
  | { type: 'matching'; pairs: Array<{ leftOptionId: string; rightOptionId: string }> }
  | { type: 'unknown' };

export interface TestAttemptAnswerRecord {
  questionId: string;
  attemptNumber: 1 | 2;
  answer?: StudentAnswerValue;
  isCorrect?: boolean;
  isUnknown?: boolean;
  pointsEarned?: number;
  firstAttemptWasWrong?: boolean;
}

export interface StudentHomeworkListItem {
  topicId: string;
  topicTitle: string;
  sectionId?: string | null;
  sectionTitle?: string;
  sectionSortOrder?: number;
  testId?: string;
  assignmentId?: string;
  assignmentCreatedAt?: string;
  attemptId?: string;
  lessonId?: string;
  lessonDate?: string;
  status: 'not_started' | 'assigned' | 'in_progress' | 'completed';
  source?: TestAssignmentSource;
  dismissedAt?: string;
  finalScore?: number;
  finalMaxScore?: number;
  finalPercent?: number;
  completedAt?: string;
}

export interface StudentIntensiveListItem {
  intensiveId: string;
  intensiveTitle: string;
  testId?: string;
  attemptId?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  finalScore?: number;
  finalMaxScore?: number;
  finalPercent?: number;
  completedAt?: string;
}

export interface TopicTestStats {
  topicId: string;
  topicTitle: string;
  studentsAttempted: number;
  studentsCompleted: number;
  avgFirstAttemptPercent: number | null;
  avgFinalPercent: number | null;
  questions: Array<{
    questionId: string;
    promptText: string;
    firstAttemptCorrectPercent: number;
    secondAttemptFixedPercent: number;
    unknownPercent: number;
  }>;
  studentResults: Array<{
    studentId: string;
    studentName: string;
    firstAttemptCorrect?: number;
    firstAttemptTotal?: number;
    finalScore?: number;
    finalMaxScore?: number;
    finalPercent?: number;
    completedAt?: string;
  }>;
}

export interface SaveTestQuestionInput {
  id?: string;
  sortOrder: number;
  questionType: TestQuestionType;
  promptText: string;
  imageUrl?: string;
  maxPoints: number;
  config: TestQuestion['config'];
  options: Array<{
    id?: string;
    sortOrder: number;
    labelText: string;
    isCorrect?: boolean;
    matchKey?: string;
  }>;
}

export interface SaveTestInput {
  title: string;
  isPublished: boolean;
  questions: SaveTestQuestionInput[];
}
