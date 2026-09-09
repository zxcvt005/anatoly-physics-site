export type QuestionCheckType =
  | 'EXACT_1'
  | 'EXACT_SET_UNORDERED'
  | 'POSITIONAL_2'
  | 'SET_2';

export type QuestionRule = {
  number: number;
  maxScore: 1 | 2;
  type: QuestionCheckType;
};

export type QuestionScoreStatus =
  | 'correct'
  | 'partial'
  | 'incorrect'
  | 'missing-reference';

export type QuestionScoreResult = {
  number: number;
  score: number;
  maxScore: number;
  status: QuestionScoreStatus;
};

export type TotalScoreResult = {
  earned: number;
  max: number;
  correct: number;
  partial: number;
  incorrect: number;
  missingReferences: number[];
  questions: QuestionScoreResult[];
};

export type ManualQuestionRule = {
  number: number;
  maxScore: 2 | 3 | 4;
};

/** Manual scores for questions 21–26. Values are clamped to each question max. */
export type ManualScoreMap = Record<string, number>;

export type ExamScoreResult = {
  firstPart: TotalScoreResult;
  firstPartScore: number;
  firstPartMax: number;
  secondPartScore: number;
  secondPartMax: number;
  primaryScore: number;
  primaryMax: number;
  testScore: number;
  testMax: number;
  manualScores: ManualScoreMap;
};

export type AnswerMap = Record<string, string>;

export type StoredReferenceAnswers = {
  version: number;
  answers: AnswerMap;
};
