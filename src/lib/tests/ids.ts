export function generateTopicId(): string {
  return `topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateQuestionId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateOptionId(): string {
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateAssignmentId(): string {
  return `asg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateAttemptId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
