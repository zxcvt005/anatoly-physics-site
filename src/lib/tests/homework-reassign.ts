import type { TestAssignmentStatus } from '@/types/tests';

export interface ExistingLessonHomeworkAssignment {
  id: string;
  testId: string;
  status: TestAssignmentStatus;
  hasAttempts: boolean;
}

export type HomeworkAssignmentSyncAction =
  | { type: 'skip' }
  | { type: 'create' }
  | { type: 'update-test'; assignmentId: string }
  | { type: 'detach-and-create'; assignmentId: string; dismiss: boolean };

/**
 * Unique index test_assignments_lesson_student_unique allows only one
 * source=lesson assignment per (lesson, student). Reassignment must reuse
 * that slot or detach the previous row instead of inserting a duplicate.
 */
export function decideLessonHomeworkAssignmentSync(input: {
  existing: ExistingLessonHomeworkAssignment | null;
  newTestId: string | null;
  reassignHomework: boolean;
}): HomeworkAssignmentSyncAction {
  if (!input.newTestId) {
    return { type: 'skip' };
  }

  if (!input.existing) {
    return { type: 'create' };
  }

  if (input.existing.testId === input.newTestId) {
    return { type: 'skip' };
  }

  if (!input.reassignHomework) {
    return { type: 'skip' };
  }

  const unused =
    input.existing.status === 'assigned' && !input.existing.hasAttempts;

  if (unused) {
    return { type: 'update-test', assignmentId: input.existing.id };
  }

  return {
    type: 'detach-and-create',
    assignmentId: input.existing.id,
    dismiss: input.existing.status !== 'completed',
  };
}

export function shouldClearLessonHomeworkSnapshot(
  action: HomeworkAssignmentSyncAction,
): boolean {
  return action.type === 'update-test' || action.type === 'detach-and-create';
}
