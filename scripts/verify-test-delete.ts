import assert from 'node:assert/strict';

function canPhysicallyDeleteTest(usage: {
  assignments: number;
  attempts: number;
}): boolean {
  return usage.assignments === 0 && usage.attempts === 0;
}

function testUnusedTestCanBeDeleted() {
  assert.equal(canPhysicallyDeleteTest({ assignments: 0, attempts: 0 }), true);
}

function testAssignmentBlocksDelete() {
  assert.equal(canPhysicallyDeleteTest({ assignments: 1, attempts: 0 }), false);
}

function testAttemptBlocksDelete() {
  assert.equal(canPhysicallyDeleteTest({ assignments: 0, attempts: 1 }), false);
}

function testCompletedAttemptBlocksDelete() {
  assert.equal(canPhysicallyDeleteTest({ assignments: 1, attempts: 3 }), false);
}

function testHideDoesNotRequireDeletePermission() {
  const used = { assignments: 2, attempts: 5 };
  assert.equal(canPhysicallyDeleteTest(used), false);
}

function run() {
  testUnusedTestCanBeDeleted();
  testAssignmentBlocksDelete();
  testAttemptBlocksDelete();
  testCompletedAttemptBlocksDelete();
  testHideDoesNotRequireDeletePermission();
  console.log('verify-test-delete: all checks passed');
}

run();
