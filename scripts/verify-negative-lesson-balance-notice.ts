import assert from 'node:assert/strict';
import {
  initialNegativeBalanceNoticeState,
  reduceNegativeBalanceNotice,
} from '../src/lib/negative-lesson-balance-notice';

function testShowsOnNegativeAndHidesAfterDismiss() {
  const shown = reduceNegativeBalanceNotice(initialNegativeBalanceNoticeState(), {
    type: 'balance',
    remainingLessons: -2,
  });
  assert.equal(shown.open, true);
  assert.equal(shown.deficitLessons, 2);

  const dismissed = reduceNegativeBalanceNotice(shown, { type: 'dismiss' });
  assert.equal(dismissed.open, false);
  assert.equal(dismissed.dismissed, true);

  const stillNegative = reduceNegativeBalanceNotice(dismissed, {
    type: 'balance',
    remainingLessons: -2,
  });
  assert.equal(stillNegative.open, false);
}

function testRecoveryThenNewDeficitShowsAgain() {
  const dismissed = reduceNegativeBalanceNotice(
    reduceNegativeBalanceNotice(initialNegativeBalanceNoticeState(), {
      type: 'balance',
      remainingLessons: -1,
    }),
    { type: 'dismiss' },
  );

  const recovered = reduceNegativeBalanceNotice(dismissed, {
    type: 'balance',
    remainingLessons: 0,
  });
  assert.equal(recovered.open, false);
  assert.equal(recovered.dismissed, false);

  const negativeAgain = reduceNegativeBalanceNotice(recovered, {
    type: 'balance',
    remainingLessons: -3,
  });
  assert.equal(negativeAgain.open, true);
  assert.equal(negativeAgain.deficitLessons, 3);
}

function testPositiveBalanceDoesNotShow() {
  const state = reduceNegativeBalanceNotice(initialNegativeBalanceNoticeState(), {
    type: 'balance',
    remainingLessons: 4,
  });
  assert.equal(state.open, false);
  assert.equal(state.deficitLessons, 0);
}

function run() {
  testShowsOnNegativeAndHidesAfterDismiss();
  testRecoveryThenNewDeficitShowsAgain();
  testPositiveBalanceDoesNotShow();
  console.log('verify-negative-lesson-balance-notice: all checks passed');
}

run();
