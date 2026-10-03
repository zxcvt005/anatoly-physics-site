/**
 * Verifies trial lesson edit persistence: date/status and all form fields
 * survive the UI → form → mapper → UPDATE row → re-read round trip.
 *
 * Run: npm run verify:trial-lesson-update
 */
import assert from 'node:assert/strict';
import {
  isTrialLessonFormReady,
  normalizeTrialDateInput,
  normalizeTrialLastName,
  type TrialLessonFormInput,
  withNormalizedTrialLastName,
} from '../src/lib/trial-lessons/form';
import {
  trialLessonPatchToUpdateRow,
  trialLessonRowToTrialLesson,
  trialLessonToInsertRow,
} from '../src/lib/supabase/trial-lessons/mappers';
import type { TrialLessonWithStudentRow } from '../src/lib/supabase/trial-lessons/types';
import type { TrialCallStatus, TrialLesson } from '../src/types/tutor';

const errors: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    errors.push(
      `${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function sampleFormInput(
  overrides: Partial<TrialLessonFormInput> = {},
): TrialLessonFormInput {
  return {
    firstName: 'Алина',
    lastName: 'Иванова',
    trialDate: '2026-09-02',
    gradeClass: '9',
    goal: 'ЕГЭ',
    currentResult: '55',
    proposedRate4Weeks: 12000,
    proposedLessonsPerWeek: 2,
    parentContacts: 'Мама: +7 900 000-00-00',
    comment: 'Первичный комментарий',
    callStatus: 'not_called',
    ...overrides,
  };
}

function sampleTrial(overrides: Partial<TrialLesson> = {}): TrialLesson {
  return {
    id: 'trial-update-verify',
    firstName: 'Алина',
    lastName: 'Иванова',
    trialDate: '2026-09-02',
    gradeClass: '9',
    goal: 'ЕГЭ',
    currentResult: '55',
    proposedRate4Weeks: 12000,
    proposedLessonsPerWeek: 2,
    parentContacts: 'Мама: +7 900 000-00-00',
    callStatus: 'not_called',
    comment: 'Первичный комментарий',
    createdAt: '2026-09-02T09:00:00.000Z',
    ...overrides,
  };
}

function sampleRow(
  overrides: Partial<TrialLessonWithStudentRow> = {},
): TrialLessonWithStudentRow {
  return {
    id: 'uuid-1',
    app_id: 'trial-update-verify',
    first_name: 'Алина',
    last_name: 'Иванова',
    trial_date: '2026-09-02',
    grade_class: '9',
    goal: 'ЕГЭ',
    current_result: '55',
    proposed_rate_4_weeks: 12000,
    proposed_lessons_per_week: 2,
    parent_name: 'Мама',
    parent_phone: '+79000000000',
    parent_contacts: 'Мама: +7 900 000-00-00',
    call_status: 'not_called',
    comment: 'Первичный комментарий',
    linked_student_id: null,
    created_at: '2026-09-02T09:00:00.000Z',
    updated_at: '2026-09-02T09:00:00.000Z',
    students: null,
    ...overrides,
  };
}

function buildTrialFromInput(
  id: string,
  input: TrialLessonFormInput,
  existing?: TrialLesson,
): TrialLesson {
  return {
    id,
    firstName: input.firstName.trim(),
    lastName: normalizeTrialLastName(input.lastName),
    trialDate: normalizeTrialDateInput(input.trialDate),
    gradeClass: input.gradeClass.trim(),
    goal: input.goal.trim(),
    currentResult: input.currentResult.trim(),
    proposedRate4Weeks: input.proposedRate4Weeks,
    proposedLessonsPerWeek: input.proposedLessonsPerWeek,
    parentContacts: input.parentContacts.trim(),
    callStatus: input.callStatus ?? existing?.callStatus ?? 'not_called',
    comment: input.comment?.trim() || undefined,
    linkedStudentId: input.linkedStudentId ?? existing?.linkedStudentId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

function roundTripUpdate(
  existing: TrialLesson,
  input: TrialLessonFormInput,
  linkedStudentUuid: string | null = null,
): TrialLesson {
  const merged = buildTrialFromInput(existing.id, input, existing);
  const updateRow = trialLessonPatchToUpdateRow(merged, linkedStudentUuid);
  const nextRow = sampleRow({
    app_id: existing.id,
    first_name: updateRow.first_name!,
    last_name: updateRow.last_name!,
    trial_date: updateRow.trial_date!,
    grade_class: updateRow.grade_class!,
    goal: updateRow.goal!,
    current_result: updateRow.current_result!,
    proposed_rate_4_weeks: updateRow.proposed_rate_4_weeks!,
    proposed_lessons_per_week: updateRow.proposed_lessons_per_week!,
    parent_name: updateRow.parent_name!,
    parent_phone: updateRow.parent_phone!,
    parent_contacts: updateRow.parent_contacts ?? null,
    call_status: updateRow.call_status!,
    comment: updateRow.comment ?? null,
    linked_student_id: updateRow.linked_student_id ?? null,
    students: linkedStudentUuid
      ? { app_id: input.linkedStudentId ?? 'student-linked' }
      : null,
  });
  return trialLessonRowToTrialLesson(nextRow);
}

test('normalizeTrialDateInput keeps YYYY-MM-DD for date inputs', () => {
  assert.equal(normalizeTrialDateInput('2026-10-01'), '2026-10-01');
  assert.equal(
    normalizeTrialDateInput('2026-10-01T12:00:00+03:00'),
    '2026-10-01',
  );
  assert.equal(normalizeTrialDateInput('2026/10/01'), '2026-10-01');
});

test('DB date-only row maps to YYYY-MM-DD, not ISO datetime', () => {
  const mapped = trialLessonRowToTrialLesson(sampleRow());
  assert.equal(mapped.trialDate, '2026-09-02');
  assert.match(mapped.trialDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(mapped.trialDate.includes('T'), false);
});

test('create insert row writes date-only trial_date', () => {
  const trial = sampleTrial({ trialDate: '2026-09-02' });
  const row = trialLessonToInsertRow(trial, null);
  assert.equal(row.trial_date, '2026-09-02');
  assert.equal(row.call_status, 'not_called');
});

test('update after create persists a new date', () => {
  const created = sampleTrial();
  const updated = roundTripUpdate(
    created,
    sampleFormInput({ trialDate: '2026-10-15' }),
  );
  assert.equal(updated.trialDate, '2026-10-15');
  assert.equal(updated.callStatus, 'not_called');
});

for (const status of [
  'agreed',
  'not_agreed',
  'not_called',
] as TrialCallStatus[]) {
  test(`update persists callStatus=${status}`, () => {
    const created = sampleTrial({ callStatus: 'not_called' });
    const updated = roundTripUpdate(
      created,
      sampleFormInput({ callStatus: status }),
    );
    assert.equal(updated.callStatus, status);
  });
}

test('update persists date and status together', () => {
  const created = sampleTrial();
  const updated = roundTripUpdate(
    created,
    sampleFormInput({
      trialDate: '2026-11-03',
      callStatus: 'not_agreed',
    }),
  );
  assert.equal(updated.trialDate, '2026-11-03');
  assert.equal(updated.callStatus, 'not_agreed');
});

test('update persists all editable form fields', () => {
  const created = sampleTrial();
  const input = sampleFormInput({
    firstName: 'Борис',
    lastName: 'Смирнов',
    trialDate: '2026-12-01',
    gradeClass: '11',
    goal: 'Олимпиада',
    currentResult: '80',
    proposedRate4Weeks: 15000,
    proposedLessonsPerWeek: 3,
    parentContacts: 'Папа: +7 911 111-11-11',
    comment: 'Обновлённый комментарий',
    callStatus: 'agreed',
    linkedStudentId: 'student-1',
  });

  const updated = roundTripUpdate(created, input, 'student-uuid-1');

  assert.equal(updated.firstName, 'Борис');
  assert.equal(updated.lastName, 'Смирнов');
  assert.equal(updated.trialDate, '2026-12-01');
  assert.equal(updated.gradeClass, '11');
  assert.equal(updated.goal, 'Олимпиада');
  assert.equal(updated.currentResult, '80');
  assert.equal(updated.proposedRate4Weeks, 15000);
  assert.equal(updated.proposedLessonsPerWeek, 3);
  assert.equal(updated.parentContacts, 'Папа: +7 911 111-11-11');
  assert.equal(updated.comment, 'Обновлённый комментарий');
  assert.equal(updated.callStatus, 'agreed');
  assert.equal(updated.linkedStudentId, 'student-1');
});

test('legacy ISO trialDate from old mapper still writes valid date-only UPDATE', () => {
  const legacy = sampleTrial({
    trialDate: '2026-09-02T12:00:00+03:00',
  });
  const input = sampleFormInput({
    trialDate: legacy.trialDate,
    callStatus: 'agreed',
  });
  const merged = buildTrialFromInput(legacy.id, input, legacy);
  const updateRow = trialLessonPatchToUpdateRow(merged, null);

  assert.equal(updateRow.trial_date, '2026-09-02');
  assert.equal(updateRow.call_status, 'agreed');
  assert.match(updateRow.trial_date!, /^\d{4}-\d{2}-\d{2}$/);
});

test('changing only status does not wipe date', () => {
  const created = sampleTrial({ trialDate: '2026-09-02', callStatus: 'not_called' });
  const updated = roundTripUpdate(
    created,
    sampleFormInput({
      trialDate: created.trialDate,
      callStatus: 'not_agreed',
    }),
  );
  assert.equal(updated.trialDate, '2026-09-02');
  assert.equal(updated.callStatus, 'not_agreed');
});

test('changing only date does not wipe status', () => {
  const created = sampleTrial({ trialDate: '2026-09-02', callStatus: 'agreed' });
  const updated = roundTripUpdate(
    created,
    sampleFormInput({
      trialDate: '2026-10-20',
      callStatus: 'agreed',
    }),
  );
  assert.equal(updated.trialDate, '2026-10-20');
  assert.equal(updated.callStatus, 'agreed');
});

test('form readiness still requires date and core fields', () => {
  assert.equal(isTrialLessonFormReady(sampleFormInput()), true);
  assert.equal(
    isTrialLessonFormReady(sampleFormInput({ trialDate: '' })),
    false,
  );
});

test('API-shaped payload keeps normalized last name and date', () => {
  const payload = withNormalizedTrialLastName(
    sampleFormInput({
      lastName: '  Петрова  ',
      trialDate: '2026-10-01T12:00:00+03:00',
      callStatus: 'not_called',
    }),
  );
  const merged = buildTrialFromInput('trial-x', payload);
  const updateRow = trialLessonPatchToUpdateRow(merged, null);
  assert.equal(updateRow.last_name, 'Петрова');
  assert.equal(updateRow.trial_date, '2026-10-01');
  assert.equal(updateRow.call_status, 'not_called');
});

if (errors.length > 0) {
  console.error('verify-trial-lesson-update failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('verify-trial-lesson-update passed');
