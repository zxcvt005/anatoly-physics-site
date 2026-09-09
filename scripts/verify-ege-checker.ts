import assert from 'node:assert/strict';
import {
  DEDICATED_TOOL_PATHS,
  findNavItemByPath,
  findParentNavItem,
  toolsNavigation,
} from '../src/lib/tools/navigation';
import {
  EXAM_PRIMARY_MAX_SCORE,
  FIRST_PART_MAX_SCORE,
  MANUAL_QUESTION_RULES,
  PRIMARY_TO_TEST_SCORE,
  QUESTION_COUNT,
  QUESTION_RULES,
  QUESTION_TYPE_LABELS,
  SECOND_PART_MAX_SCORE,
  TOTAL_MAX_SCORE,
  createEmptyAnswerMap,
  createEmptyManualScoreMap,
  getManualQuestionRule,
  getNextQuestionNumber,
  getPreviousQuestionNumber,
  getQuestionRule,
  getTestScore,
  resolveEnterNavigation,
} from '../src/lib/tools/ege-checker/constants';
import {
  areReferencesComplete,
  calculateExamScore,
  calculateQuestionScore,
  calculateQuestionScoreByNumber,
  calculateSecondPartScore,
  calculateTotalScore,
  clampManualScore,
  compareExact,
  comparePositional,
  compareUnordered,
  compareUnorderedPartial,
  getMissingReferenceNumbers,
  hasAnyManualScores,
  hasAnyStudentAnswers,
  normalizeAnswer,
  sanitizeManualScores,
} from '../src/lib/tools/ege-checker/scoring';
import {
  parseStoredReferences,
  serializeReferences,
} from '../src/lib/tools/ege-checker/storage';
import type { AnswerMap, ManualScoreMap } from '../src/lib/tools/ege-checker/types';

const errors: string[] = [];
let passed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function fillMap(
  build: (number: number) => string,
  source: AnswerMap = createEmptyAnswerMap(),
): AnswerMap {
  const answers = { ...source };
  for (const rule of QUESTION_RULES) {
    answers[String(rule.number)] = build(rule.number);
  }
  return answers;
}

const EXACT_ONE_NUMBERS = [1, 2, 3, 4, 7, 8, 11, 12, 13, 16, 19];
const SET_TWO_NUMBERS = [5, 9, 14, 18];
const POSITIONAL_NUMBERS = [6, 10, 15, 17];

const SAMPLE_REFERENCES = fillMap((number) => {
  const type = getQuestionRule(number).type;
  if (type === 'EXACT_1') {
    return '8';
  }
  if (type === 'SET_2') {
    return '123';
  }
  if (type === 'POSITIONAL_2') {
    return '21';
  }
  return '135';
});

test('question config has 20 items and max total 28', () => {
  assert.equal(QUESTION_RULES.length, QUESTION_COUNT);
  assert.equal(QUESTION_COUNT, 20);
  assert.equal(
    QUESTION_RULES.reduce((sum, rule) => sum + rule.maxScore, 0),
    TOTAL_MAX_SCORE,
  );
  assert.equal(TOTAL_MAX_SCORE, 28);
});

test('each question has the official max score and type', () => {
  const expectedMax: Record<number, number> = {
    1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 7: 1, 8: 1, 9: 2, 10: 2,
    11: 1, 12: 1, 13: 1, 14: 2, 15: 2, 16: 1, 17: 2, 18: 2, 19: 1, 20: 1,
  };
  const expectedType: Record<number, string> = {
    1: 'EXACT_1',
    2: 'EXACT_1',
    3: 'EXACT_1',
    4: 'EXACT_1',
    5: 'SET_2',
    6: 'POSITIONAL_2',
    7: 'EXACT_1',
    8: 'EXACT_1',
    9: 'SET_2',
    10: 'POSITIONAL_2',
    11: 'EXACT_1',
    12: 'EXACT_1',
    13: 'EXACT_1',
    14: 'SET_2',
    15: 'POSITIONAL_2',
    16: 'EXACT_1',
    17: 'POSITIONAL_2',
    18: 'SET_2',
    19: 'EXACT_1',
    20: 'EXACT_SET_UNORDERED',
  };

  for (const rule of QUESTION_RULES) {
    assert.equal(rule.maxScore, expectedMax[rule.number], `max for ${rule.number}`);
    assert.equal(rule.type, expectedType[rule.number], `type for ${rule.number}`);
    assert.ok(QUESTION_TYPE_LABELS[rule.type]);
  }
});

test('normalizeAnswer trims edges only', () => {
  assert.equal(normalizeAnswer('  12 3  '), '12 3');
  assert.equal(normalizeAnswer('123'), '123');
  assert.equal(normalizeAnswer(''), '');
});

test('compareExact requires a full match after trim', () => {
  assert.equal(compareExact('12', '12'), 1);
  assert.equal(compareExact(' 12 ', '12'), 1);
  assert.equal(compareExact('21', '12'), 0);
  assert.equal(compareExact('12 ', '1 2'), 0);
  assert.equal(compareExact('123', '12'), 0);
});

for (const number of EXACT_ONE_NUMBERS) {
  test(`question ${number} EXACT_1 scores 1 or 0`, () => {
    const rule = getQuestionRule(number);
    assert.equal(calculateQuestionScore(rule, '7', '7').score, 1);
    assert.equal(calculateQuestionScore(rule, '7', '8').score, 0);
    assert.equal(calculateQuestionScore(rule, '8', '8').status, 'correct');
    assert.equal(calculateQuestionScore(rule, '9', '8').status, 'incorrect');
  });
}

test('question 20 unordered complete match is 1 regardless of order', () => {
  assert.equal(compareUnordered('123', '123'), 1);
  assert.equal(compareUnordered('321', '123'), 1);
  assert.equal(compareUnordered(' 132 ', '123'), 1);
  assert.equal(calculateQuestionScoreByNumber(20, '531', '135').score, 1);
});

test('question 20 rejects missing or extra symbols', () => {
  assert.equal(compareUnordered('12', '123'), 0);
  assert.equal(compareUnordered('1234', '123'), 0);
  assert.equal(calculateQuestionScoreByNumber(20, '13', '135').score, 0);
  assert.equal(calculateQuestionScoreByNumber(20, '1357', '135').score, 0);
});

test('question 20 compares a multiset, not a Set', () => {
  assert.equal(compareUnordered('121', '112'), 1);
  assert.equal(compareUnordered('112', '112'), 1);
  assert.equal(compareUnordered('111', '112'), 0);
  assert.equal(compareUnordered('1122', '112'), 0);
  assert.equal(calculateQuestionScoreByNumber(20, '211', '112').score, 1);
  assert.equal(calculateQuestionScoreByNumber(20, '111', '112').score, 0);
});

for (const number of POSITIONAL_NUMBERS) {
  test(`question ${number} positional full match is 2`, () => {
    assert.equal(comparePositional('21', '21'), 2);
    assert.equal(calculateQuestionScoreByNumber(number, ' 21 ', '21').score, 2);
  });

  test(`question ${number} positional one mismatch is 1`, () => {
    assert.equal(comparePositional('22', '21'), 1);
    assert.equal(comparePositional('11', '21'), 1);
    assert.equal(calculateQuestionScoreByNumber(number, '23', '21').score, 1);
    assert.equal(calculateQuestionScoreByNumber(number, '23', '21').status, 'partial');
  });

  test(`question ${number} positional two mismatches is 0`, () => {
    assert.equal(comparePositional('12', '21'), 0);
    assert.equal(calculateQuestionScoreByNumber(number, '34', '21').score, 0);
  });

  test(`question ${number} extra character is always 0`, () => {
    assert.equal(comparePositional('211', '21'), 0);
    assert.equal(comparePositional('210', '21'), 0);
    assert.equal(comparePositional('21 ', '21'), 2);
    assert.equal(comparePositional('2 1', '21'), 0);
    assert.equal(calculateQuestionScoreByNumber(number, '211', '21').score, 0);
  });

  test(`question ${number} shorter answers use strict positional mismatches`, () => {
    assert.equal(comparePositional('2', '21'), 1);
    assert.equal(comparePositional('1', '21'), 0);
    assert.equal(comparePositional('', '21'), 0);
    assert.equal(comparePositional('2', '12'), 0);
    assert.equal(calculateQuestionScoreByNumber(number, '2', '21').score, 1);
    assert.equal(calculateQuestionScoreByNumber(number, '', '21').score, 0);
  });
}

for (const number of SET_TWO_NUMBERS) {
  test(`question ${number} unordered partial scoring`, () => {
    assert.equal(compareUnorderedPartial('123', '123'), 2);
    assert.equal(compareUnorderedPartial('321', '123'), 2);
    assert.equal(compareUnorderedPartial('124', '123'), 1);
    assert.equal(compareUnorderedPartial('1234', '123'), 1);
    assert.equal(compareUnorderedPartial('12', '123'), 1);
    assert.equal(compareUnorderedPartial('1245', '123'), 0);
    assert.equal(calculateQuestionScoreByNumber(number, '123', '123').score, 2);
    assert.equal(calculateQuestionScoreByNumber(number, '124', '123').score, 1);
    assert.equal(calculateQuestionScoreByNumber(number, '1234', '123').score, 1);
    assert.equal(calculateQuestionScoreByNumber(number, '12', '123').score, 1);
    assert.equal(calculateQuestionScoreByNumber(number, '1245', '123').score, 0);
  });

  test(`question ${number} keeps duplicate symbols in the multiset`, () => {
    assert.equal(compareUnorderedPartial('112', '112'), 2);
    assert.equal(compareUnorderedPartial('121', '112'), 2);
    assert.equal(compareUnorderedPartial('111', '112'), 1);
    assert.equal(compareUnorderedPartial('11', '112'), 1);
    assert.equal(compareUnorderedPartial('1111', '112'), 0);
    assert.equal(calculateQuestionScoreByNumber(number, '211', '112').score, 2);
    assert.equal(calculateQuestionScoreByNumber(number, '111', '112').score, 1);
  });
}

test('SET_2 keeps an internal space as a student error', () => {
  assert.equal(compareUnorderedPartial('12 4', '124'), 1);
  assert.equal(compareUnorderedPartial('12 4', '123'), 0);
});

test('empty reference is not treated as a matching empty answer', () => {
  const result = calculateQuestionScoreByNumber(1, '', '');
  assert.equal(result.score, 0);
  assert.equal(result.status, 'missing-reference');
  assert.equal(calculateQuestionScoreByNumber(6, '21', '').status, 'missing-reference');
  assert.equal(areReferencesComplete(createEmptyAnswerMap()), false);
  assert.deepEqual(getMissingReferenceNumbers(createEmptyAnswerMap()), [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  ]);
});

test('all correct answers give 28/28', () => {
  const total = calculateTotalScore(SAMPLE_REFERENCES, SAMPLE_REFERENCES);
  assert.equal(total.earned, 28);
  assert.equal(total.max, 28);
  assert.equal(total.correct, 20);
  assert.equal(total.partial, 0);
  assert.equal(total.incorrect, 0);
  assert.deepEqual(total.missingReferences, []);
});

test('all incorrect answers give 0/28', () => {
  const answers = fillMap((number) => {
    const type = getQuestionRule(number).type;
    if (type === 'EXACT_1') {
      return '9';
    }
    if (type === 'SET_2') {
      return '45';
    }
    if (type === 'POSITIONAL_2') {
      return '34';
    }
    return '246';
  });
  const total = calculateTotalScore(answers, SAMPLE_REFERENCES);
  assert.equal(total.earned, 0);
  assert.equal(total.max, 28);
  assert.equal(total.correct, 0);
  assert.equal(total.partial, 0);
  assert.equal(total.incorrect, 20);
});

test('mixed partial scores add up correctly', () => {
  const answers = fillMap((number) => {
    if (number === 1) {
      return '8';
    }
    if (number === 5) {
      return '124';
    }
    if (number === 6) {
      return '22';
    }
    if (number === 20) {
      return '153';
    }
    return '0';
  });

  const total = calculateTotalScore(answers, SAMPLE_REFERENCES);
  assert.equal(total.questions[0]?.score, 1);
  assert.equal(total.questions[4]?.score, 1);
  assert.equal(total.questions[5]?.score, 1);
  assert.equal(total.questions[19]?.score, 1);
  assert.equal(total.earned, 4);
  assert.equal(total.correct, 2);
  assert.equal(total.partial, 2);
  assert.equal(total.incorrect, 16);
});

test('changing one already scored answer recalculates the total', () => {
  const answers = { ...SAMPLE_REFERENCES };
  const before = calculateTotalScore(answers, SAMPLE_REFERENCES);
  answers['5'] = '12';
  const after = calculateTotalScore(answers, SAMPLE_REFERENCES);
  assert.equal(before.earned, 28);
  assert.equal(after.earned, 27);
  assert.equal(after.questions[4]?.status, 'partial');
  assert.equal(after.correct, 19);
  assert.equal(after.partial, 1);
});

test('Enter navigation moves forward and completes on question 20', () => {
  assert.equal(getNextQuestionNumber(1), 2);
  assert.equal(getNextQuestionNumber(19), 20);
  assert.equal(getNextQuestionNumber(20), null);
  assert.deepEqual(resolveEnterNavigation(1), { currentNumber: 2, completed: false });
  assert.deepEqual(resolveEnterNavigation(19), { currentNumber: 20, completed: false });
  assert.deepEqual(resolveEnterNavigation(20), { currentNumber: 20, completed: true });
});

test('Shift+Enter moves to the previous question and never completes', () => {
  assert.equal(getPreviousQuestionNumber(1), null);
  assert.equal(getPreviousQuestionNumber(7), 6);
  assert.deepEqual(resolveEnterNavigation(1, true), {
    currentNumber: 1,
    completed: false,
  });
  assert.deepEqual(resolveEnterNavigation(20, true), {
    currentNumber: 19,
    completed: false,
  });
});

test('partial references are reported and block a complete check', () => {
  const references = { ...SAMPLE_REFERENCES };
  references['3'] = '';
  references['8'] = '   ';
  references['19'] = '';
  assert.equal(areReferencesComplete(references), false);
  assert.deepEqual(getMissingReferenceNumbers(references), [3, 8, 19]);

  const total = calculateTotalScore(SAMPLE_REFERENCES, references);
  assert.ok(total.missingReferences.includes(3));
  assert.ok(total.earned < 28);
});

test('student answers are detected without touching references', () => {
  assert.equal(hasAnyStudentAnswers(createEmptyAnswerMap()), false);
  assert.equal(hasAnyStudentAnswers({ ...createEmptyAnswerMap(), '1': '8' }), true);
  assert.equal(hasAnyStudentAnswers({ ...createEmptyAnswerMap(), '4': '  ' }), false);
});

test('localStorage parser is versioned and crash-safe', () => {
  assert.deepEqual(parseStoredReferences(null), createEmptyAnswerMap());
  assert.deepEqual(parseStoredReferences('{'), createEmptyAnswerMap());
  assert.deepEqual(parseStoredReferences('"nope"'), createEmptyAnswerMap());
  assert.deepEqual(
    parseStoredReferences(JSON.stringify({ version: 2, answers: { '1': '8' } })),
    createEmptyAnswerMap(),
  );
  assert.deepEqual(
    parseStoredReferences(JSON.stringify({ version: 1, answers: 'bad' })),
    createEmptyAnswerMap(),
  );

  const parsed = parseStoredReferences(
    JSON.stringify({
      version: 1,
      answers: { '1': '8', '5': 123, extra: 'ignore' },
    }),
  );
  assert.equal(parsed['1'], '8');
  assert.equal(parsed['5'], '');
  assert.equal(parsed['20'], '');

  const roundTrip = parseStoredReferences(serializeReferences(SAMPLE_REFERENCES));
  assert.deepEqual(roundTrip, SAMPLE_REFERENCES);
  assert.equal(serializeReferences(SAMPLE_REFERENCES).includes('student'), false);
});

test('navigation includes the EGE checker under non-physics', () => {
  const nonPhysics = toolsNavigation.find((item) => item.id === 'non-physics');
  const tool = findNavItemByPath('/tools/non-physics/ege-checker');
  assert.ok(nonPhysics?.children?.some((child) => child.id === 'ege-checker'));
  assert.equal(tool?.title, 'Проверка первой части ЕГЭ');
  assert.equal(tool?.path, '/tools/non-physics/ege-checker');
  assert.equal(tool?.type, 'tool');
  assert.equal(tool?.icon, 'egeChecker');
  assert.equal(findParentNavItem('/tools/non-physics/ege-checker')?.id, 'non-physics');
  assert.ok(DEDICATED_TOOL_PATHS.includes('/tools/non-physics/ege-checker'));
});

test('part maxima are 28 + 17 = 45', () => {
  assert.equal(FIRST_PART_MAX_SCORE, 28);
  assert.equal(TOTAL_MAX_SCORE, 28);
  assert.equal(SECOND_PART_MAX_SCORE, 17);
  assert.equal(EXAM_PRIMARY_MAX_SCORE, 45);
  assert.equal(
    MANUAL_QUESTION_RULES.reduce((sum, rule) => sum + rule.maxScore, 0),
    17,
  );
});

test('manual questions 21-26 have official max scores', () => {
  const expected: Record<number, number> = {
    21: 3,
    22: 2,
    23: 2,
    24: 3,
    25: 3,
    26: 4,
  };
  assert.equal(MANUAL_QUESTION_RULES.length, 6);
  for (const rule of MANUAL_QUESTION_RULES) {
    assert.equal(rule.maxScore, expected[rule.number]);
    assert.equal(getManualQuestionRule(rule.number).maxScore, expected[rule.number]);
  }
});

test('primary to test score scale matches the official table', () => {
  assert.equal(PRIMARY_TO_TEST_SCORE.length, 46);
  assert.equal(getTestScore(0), 0);
  assert.equal(getTestScore(1), 5);
  assert.equal(getTestScore(2), 9);
  assert.equal(getTestScore(10), 41);
  assert.equal(getTestScore(20), 58);
  assert.equal(getTestScore(28), 70);
  assert.equal(getTestScore(29), 71);
  assert.equal(getTestScore(36), 82);
  assert.equal(getTestScore(37), 84);
  assert.equal(getTestScore(40), 90);
  assert.equal(getTestScore(45), 100);
  assert.equal(getTestScore(-1), 0);
  assert.equal(getTestScore(99), 100);
});

test('all first-part correct and empty second part is 28 primary / 70 test', () => {
  const exam = calculateExamScore(
    SAMPLE_REFERENCES,
    SAMPLE_REFERENCES,
    createEmptyManualScoreMap(),
  );
  assert.equal(exam.firstPartScore, 28);
  assert.equal(exam.firstPartMax, 28);
  assert.equal(exam.secondPartScore, 0);
  assert.equal(exam.secondPartMax, 17);
  assert.equal(exam.primaryScore, 28);
  assert.equal(exam.primaryMax, 45);
  assert.equal(exam.testScore, 70);
});

test('max second part alone is 17 / 17', () => {
  const maxManual: ManualScoreMap = {
    '21': 3,
    '22': 2,
    '23': 2,
    '24': 3,
    '25': 3,
    '26': 4,
  };
  assert.equal(calculateSecondPartScore(maxManual), 17);
  const exam = calculateExamScore(
    createEmptyAnswerMap(),
    SAMPLE_REFERENCES,
    maxManual,
  );
  assert.equal(exam.firstPartScore, 0);
  assert.equal(exam.secondPartScore, 17);
  assert.equal(exam.primaryScore, 17);
  assert.equal(exam.testScore, getTestScore(17));
});

test('full exam perfect score is 45 primary / 100 test', () => {
  const maxManual = {
    '21': 3,
    '22': 2,
    '23': 2,
    '24': 3,
    '25': 3,
    '26': 4,
  };
  const exam = calculateExamScore(
    SAMPLE_REFERENCES,
    SAMPLE_REFERENCES,
    maxManual,
  );
  assert.equal(exam.primaryScore, 45);
  assert.equal(exam.testScore, 100);
});

test('zero primary gives zero test', () => {
  const exam = calculateExamScore(
    createEmptyAnswerMap(),
    SAMPLE_REFERENCES,
    createEmptyManualScoreMap(),
  );
  assert.equal(exam.primaryScore, 0);
  assert.equal(exam.testScore, 0);
});

test('24 first + 13 second = 37 primary / 84 test', () => {
  const answers = { ...SAMPLE_REFERENCES };
  answers['2'] = '9';
  answers['5'] = '124';
  answers['6'] = '22';
  // Perfect first part is 28; wrong #2 (-1), partial #5 (-1), partial #6 (-1) => 25.
  // Adjust to land on 24: also wrong #7.
  answers['7'] = '0';

  const firstOnly = calculateTotalScore(answers, SAMPLE_REFERENCES);
  assert.equal(firstOnly.earned, 24);

  const manual: ManualScoreMap = {
    '21': 3,
    '22': 2,
    '23': 2,
    '24': 3,
    '25': 2,
    '26': 1,
  };
  assert.equal(calculateSecondPartScore(manual), 13);

  const exam = calculateExamScore(answers, SAMPLE_REFERENCES, manual);
  assert.equal(exam.firstPartScore, 24);
  assert.equal(exam.secondPartScore, 13);
  assert.equal(exam.primaryScore, 37);
  assert.equal(exam.testScore, 84);
});

test('manual scores are clamped to question maxima', () => {
  assert.equal(clampManualScore(21, 99), 3);
  assert.equal(clampManualScore(22, -4), 0);
  assert.equal(clampManualScore(26, 4.9), 4);
  assert.equal(clampManualScore(26, Number.NaN), 0);

  const sanitized = sanitizeManualScores({
    '21': 10,
    '22': -1,
    '23': 1.5,
    '24': 3,
    '25': 100,
    '26': 4,
  });
  assert.deepEqual(sanitized, {
    '21': 3,
    '22': 0,
    '23': 1,
    '24': 3,
    '25': 3,
    '26': 4,
  });
});

test('changing a second-part score recalculates primary and test', () => {
  const answers = { ...SAMPLE_REFERENCES };
  answers['2'] = '9';
  answers['5'] = '124';
  answers['6'] = '22';
  answers['7'] = '0';
  assert.equal(calculateTotalScore(answers, SAMPLE_REFERENCES).earned, 24);

  const examBefore = calculateExamScore(answers, SAMPLE_REFERENCES, {
    '21': 3,
    '22': 2,
    '23': 2,
    '24': 2,
    '25': 2,
    '26': 2,
  });
  assert.equal(examBefore.primaryScore, 37);
  assert.equal(examBefore.testScore, 84);

  const examAfter = calculateExamScore(answers, SAMPLE_REFERENCES, {
    '21': 3,
    '22': 2,
    '23': 2,
    '24': 3,
    '25': 2,
    '26': 2,
  });
  assert.equal(examAfter.primaryScore, 38);
  assert.equal(examAfter.testScore, 86);
});

test('hasAnyManualScores detects non-zero second part only', () => {
  assert.equal(hasAnyManualScores(createEmptyManualScoreMap()), false);
  assert.equal(hasAnyManualScores({ ...createEmptyManualScoreMap(), '24': 1 }), true);
});

if (errors.length > 0) {
  console.error('verify-ege-checker failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-ege-checker passed (${passed} tests)`);
