import type { IntensiveStatus } from '@/types/tutor';

export const INTENSIVE_STATUS_CYCLE: IntensiveStatus[] = [
  'not_started',
  'in_progress',
  'completed',
];

export const intensiveStatusCode: Record<IntensiveStatus, 0 | 1 | 2> = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
};

export const intensiveStatusLabels: Record<IntensiveStatus, string> = {
  not_started: 'Не приступал',
  in_progress: 'В процессе',
  completed: 'Освоен',
};

export const intensiveStudentLabels: Record<IntensiveStatus, string> = {
  not_started: 'Не приступал',
  in_progress: 'В процессе',
  completed: 'Освоен',
};

export function cycleIntensiveStatus(status: IntensiveStatus): IntensiveStatus {
  const index = INTENSIVE_STATUS_CYCLE.indexOf(status);
  return INTENSIVE_STATUS_CYCLE[(index + 1) % INTENSIVE_STATUS_CYCLE.length];
}

export function progressKey(studentId: string, intensiveId: string): string {
  return `${studentId}:${intensiveId}`;
}

export function parseProgressKey(key: string): {
  studentId: string;
  intensiveId: string;
} {
  const separatorIndex = key.indexOf(':');

  if (separatorIndex === -1) {
    return { studentId: key, intensiveId: '' };
  }

  return {
    studentId: key.slice(0, separatorIndex),
    intensiveId: key.slice(separatorIndex + 1),
  };
}

export function generateIntensiveId(): string {
  return `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
