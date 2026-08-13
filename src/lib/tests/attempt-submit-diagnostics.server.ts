import 'server-only';

export function logStudentAttemptSubmit(payload: {
  action: 'submit_attempt_1' | 'submit_attempt_2';
  attemptId?: string;
  answerCount: number;
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  stage?: string;
  error?: string;
}): void {
  console.info('[tests:student-submit]', payload);
}
