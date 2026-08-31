'use client';

import { useRouter } from 'next/navigation';
import { TestTakingFlow } from '@/components/tutor/TestTakingFlow';
import { testsHomePath } from '@/lib/tests/student-navigation';

type TestSessionViewProps = {
  token: string;
  testId: string;
  title: string;
  source: 'lesson' | 'self';
  attemptId?: string;
  assignmentId?: string;
  viewResult?: boolean;
};

export function TestSessionView({
  token,
  testId,
  title,
  source,
  attemptId,
  assignmentId,
  viewResult,
}: TestSessionViewProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push(testsHomePath(token));
    router.refresh();
  };

  const handleReturnToCatalog = () => {
    router.back();
    router.refresh();
  };

  return (
    <TestTakingFlow
      token={token}
      testId={testId}
      attemptId={attemptId}
      assignmentId={assignmentId}
      source={source}
      title={title}
      viewResult={viewResult}
      onClose={handleClose}
      onReturnToCatalog={handleReturnToCatalog}
    />
  );
}
