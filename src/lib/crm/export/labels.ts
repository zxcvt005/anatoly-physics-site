import type {
  IntensiveStatus,
  LessonStatus,
  LessonType,
  PaymentStatus,
  StudentActivityStatus,
  TrialCallStatus,
} from '@/types/tutor';

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  confirmed: 'Подтверждена',
  pending: 'Ожидает',
  rejected: 'Отклонена',
};

export const lessonStatusLabels: Record<LessonStatus, string> = {
  scheduled: 'Запланировано',
  completed: 'Проведено',
};

export const lessonTypeLabels: Record<LessonType, string> = {
  regular: 'Регулярное',
  makeup: 'Отработка',
  extra: 'Дополнительное',
  transfer: 'Перенос',
};

export const activityStatusLabels: Record<StudentActivityStatus, string> = {
  active: 'Активен',
  paused: 'Пауза',
};

export const intensiveStatusLabels: Record<IntensiveStatus, string> = {
  not_started: 'Не приступал',
  in_progress: 'В процессе',
  completed: 'Освоен',
};

export const trialCallStatusLabels: Record<TrialCallStatus, string> = {
  not_called: 'Не звонил',
  agreed: 'Договорились',
  not_agreed: 'Не договорились',
};

export function formatYesNo(value: boolean | undefined): string {
  if (value === undefined) return '—';
  return value ? 'Да' : 'Нет';
}
