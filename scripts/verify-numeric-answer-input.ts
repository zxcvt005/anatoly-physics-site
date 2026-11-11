/**
 * Numeric answer fields must allow minus and decimals on mobile keyboards.
 *
 * Run: npm run verify:numeric-answer-input
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gradeNumericAnswer } from '../src/lib/tests/grading';
import {
  NUMERIC_ANSWER_INPUT_MODE,
  NUMERIC_ANSWER_INPUT_PATTERN,
} from '../src/lib/tests/numeric-answer-input';

function testInputModeAllowsSignedDecimalKeyboard() {
  assert.equal(
    NUMERIC_ANSWER_INPUT_MODE,
    'text',
    'inputMode=text is required so iOS/Android keyboards expose minus and decimals',
  );
  assert.notEqual(NUMERIC_ANSWER_INPUT_MODE, 'numeric');
  assert.notEqual(NUMERIC_ANSWER_INPUT_MODE, 'decimal');
  assert.equal(NUMERIC_ANSWER_INPUT_PATTERN.includes('-'), true);
  assert.ok(
    NUMERIC_ANSWER_INPUT_PATTERN.includes('.') ||
      NUMERIC_ANSWER_INPUT_PATTERN.includes(','),
  );
}

function testTakingFlowUsesSharedInputMode() {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/tutor/TestTakingFlow.tsx'),
    'utf8',
  );
  assert.equal(source.includes('NUMERIC_ANSWER_INPUT_MODE'), true);
  assert.equal(source.includes('NUMERIC_ANSWER_INPUT_PATTERN'), true);
  assert.equal(/inputMode=["']decimal["']/.test(source), false);
  assert.equal(/inputMode=["']numeric["']/.test(source), false);
}

function testGradingStillAcceptsSignedDecimals() {
  const config = { correctValue: -12.5, tolerance: 0 };
  assert.equal(
    gradeNumericAnswer(config, { type: 'numeric', value: '-12,5' }).isCorrect,
    true,
  );
  assert.equal(
    gradeNumericAnswer(config, { type: 'numeric', value: '-12.5' }).isCorrect,
    true,
  );
  assert.equal(
    gradeNumericAnswer(
      { correctValue: 0, tolerance: 0 },
      { type: 'numeric', value: '0' },
    ).isCorrect,
    true,
  );
  assert.equal(
    gradeNumericAnswer(config, { type: 'numeric', value: 'abc' }).isCorrect,
    false,
  );
}

function run() {
  testInputModeAllowsSignedDecimalKeyboard();
  testTakingFlowUsesSharedInputMode();
  testGradingStillAcceptsSignedDecimals();
  console.log('verify-numeric-answer-input: all checks passed');
}

run();
