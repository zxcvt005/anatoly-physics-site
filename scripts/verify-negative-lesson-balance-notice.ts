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

function testEarlyNonNegativeSnapshotDoesNotBlockLaterDeficit() {
  const emptySnapshot = reduceNegativeBalanceNotice(
    initialNegativeBalanceNoticeState(),
    { type: 'balance', remainingLessons: 8 },
  );
  assert.equal(emptySnapshot.open, false);

  const afterLessons = reduceNegativeBalanceNotice(emptySnapshot, {
    type: 'balance',
    remainingLessons: -7,
  });
  assert.equal(afterLessons.open, true);
  assert.equal(afterLessons.deficitLessons, 7);
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
  testEarlyNonNegativeSnapshotDoesNotBlockLaterDeficit();
  console.log('verify-negative-lesson-balance-notice: all checks passed');
}

run();
