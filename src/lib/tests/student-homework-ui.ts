import type { StudentHomeworkListItem } from '@/types/tests';

export interface HomeworkTestSession {
  testId: string;
  attemptId?: string;
  assignmentId?: string;
  source: 'lesson' | 'self';
  title: string;
  viewResult?: boolean;
}

export function getHomeworkAction(item: StudentHomeworkListItem): {
  label: string;
  attemptId?: string;
  viewResult?: boolean;
} | null {
  if (!item.testId) return null;

  if (item.status === 'completed') {
    return {
      label: 'Посмотреть результат',
      attemptId: item.attemptId,
      viewResult: true,
    };
  }

  if (item.status === 'in_progress') {
    return {
      label: 'Продолжить',
      attemptId: item.attemptId,
    };
  }

  return { label: 'Начать' };
}

export function statusLabel(
  status: StudentHomeworkListItem['status'],
  source?: StudentHomeworkListItem['source'],
): string {
  if (status === 'assigned') return source === 'lesson' ? 'Назначено' : 'Доступно';
  if (status === 'in_progress') return 'Начато';
  if (status === 'completed') return 'Выполнено';
  return 'Не проходилось';
}

export function buildSessionSearchParams(
  session: HomeworkTestSession,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('testId', session.testId);
  params.set('title', session.title);
  params.set('source', session.source);

  if (session.attemptId) {
    params.set('attemptId', session.attemptId);
  }
  if (session.assignmentId) {
    params.set('assignmentId', session.assignmentId);
  }
  if (session.viewResult) {
    params.set('viewResult', '1');
  }

  return params;
}
