import { TestSessionPageClient } from '@/components/student-tests/TestSessionPageClient';

interface SessionPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StudentTestSessionPage({
  params,
  searchParams,
}: SessionPageProps) {
  const { token } = await params;
  const query = await searchParams;

  const testId = typeof query.testId === 'string' ? query.testId : '';
  const title = typeof query.title === 'string' ? query.title : 'Тест';
  const source =
    query.source === 'lesson' || query.source === 'self' ? query.source : 'self';
  const attemptId =
    typeof query.attemptId === 'string' ? query.attemptId : undefined;
  const assignmentId =
    typeof query.assignmentId === 'string' ? query.assignmentId : undefined;
  const viewResult = query.viewResult === '1';

  return (
    <TestSessionPageClient
      token={token}
      testId={testId}
      title={title}
      source={source}
      attemptId={attemptId}
      assignmentId={assignmentId}
      viewResult={viewResult}
    />
  );
}
