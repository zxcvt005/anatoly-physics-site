import assert from 'node:assert/strict';
import {
  findQuestionAppIdByStorageUuid,
  questionAppIdToStorageUuid,
} from '../src/lib/tests/question-storage-id';

function testDeterministicUuid() {
  const appId = 'q-123-test';
  const first = questionAppIdToStorageUuid(appId);
  const second = questionAppIdToStorageUuid(appId);
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f-]{36}$/i);
}

function testReverseLookup() {
  const snapshots = [{ id: 'q-alpha' }, { id: 'q-beta' }];
  const uuid = questionAppIdToStorageUuid('q-beta');
  assert.equal(findQuestionAppIdByStorageUuid(snapshots, uuid), 'q-beta');
}

function run() {
  testDeterministicUuid();
  testReverseLookup();
  console.log('verify-question-storage-id: all checks passed');
}

run();
