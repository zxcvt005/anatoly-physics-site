import assert from 'node:assert/strict';
import {
  buildNumericDraftFromConfig,
  formatEditorNumericValue,
  numericDraftToConfig,
  parseEditorNumericValue,
  validateNumericAnswerDraft,
} from '../src/lib/tests/numeric-editor';

function testEmptyDraftIsInvalidForSave() {
  assert.equal(validateNumericAnswerDraft(''), 'Укажите правильный ответ');
  assert.equal(validateNumericAnswerDraft('   '), 'Укажите правильный ответ');
}

function testTyping123WithoutLeadingZero() {
  assert.equal(parseEditorNumericValue('123'), 123);
  assert.equal(numericDraftToConfig({ answer: '123', tolerance: '0' })?.correctValue, 123);
}

function testZeroIsValidAnswer() {
  assert.equal(parseEditorNumericValue('0'), 0);
  assert.equal(validateNumericAnswerDraft('0'), null);
}

function testNegativeAndDecimal() {
  assert.equal(parseEditorNumericValue('-1.5'), -1.5);
  assert.equal(parseEditorNumericValue('1,25'), 1.25);
}

function testReloadedValueFormatsWithoutLeadingZero() {
  const draft = buildNumericDraftFromConfig({ correctValue: 123, tolerance: 0 });
  assert.equal(draft.answer, '123');
  assert.equal(formatEditorNumericValue(123), '123');
}

function testEmptyDraftDoesNotBecomeZeroOnSave() {
  assert.equal(numericDraftToConfig({ answer: '', tolerance: '0' }), null);
}

function testToleranceDefaultsToZero() {
  const config = numericDraftToConfig({ answer: '10', tolerance: '' });
  assert.equal(config?.tolerance, 0);
}

function run() {
  testEmptyDraftIsInvalidForSave();
  testTyping123WithoutLeadingZero();
  testZeroIsValidAnswer();
  testNegativeAndDecimal();
  testReloadedValueFormatsWithoutLeadingZero();
  testEmptyDraftDoesNotBecomeZeroOnSave();
  testToleranceDefaultsToZero();
  console.log('verify-numeric-editor: all checks passed');
}

run();
