import 'server-only';

interface TestEditorSaveLog {
  operation: 'save';
  topicId?: string;
  intensiveId?: string;
  questionCount: number;
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  testId?: string;
  version?: number;
  questionsReturned?: number;
  error?: string;
  supabaseCode?: string;
}

interface TestDeleteLog {
  operation: 'delete' | 'hide';
  topicId?: string;
  intensiveId?: string;
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  code?: string;
  error?: string;
}

export function logTestEditorSave(payload: TestEditorSaveLog): void {
  console.info('[tests:editor-save]', payload);
}

export function logTestDelete(payload: TestDeleteLog): void {
  console.info('[tests:delete]', payload);
}

export function toUserFacingTestSaveError(error: string): string {
  const map: Record<string, string> = {
    'Each question must have a prompt': 'У каждого задания должно быть условие',
    'Numeric question requires correctValue': 'Укажите правильный числовой ответ',
    'Numeric tolerance must be non-negative': 'Погрешность не может быть отрицательной',
    'Short text question requires acceptedAnswers': 'Укажите допустимые текстовые ответы',
    'Single choice requires at least 2 options': 'Добавьте минимум 2 варианта ответа',
    'Single choice requires exactly one correct option':
      'Отметьте ровно один правильный вариант',
    'Multiple choice requires at least 2 options': 'Добавьте минимум 2 варианта ответа',
    'Multiple choice requires at least one correct option':
      'Отметьте хотя бы один правильный вариант',
    'Matching requires at least 2 pairs': 'Добавьте минимум 2 пары для сопоставления',
    'Matching left and right counts must match':
      'Количество элементов слева и справа должно совпадать',
    'Supabase is not configured': 'База данных не настроена',
    'Missing test payload': 'Не переданы данные теста',
    'Add at least one question': 'Добавьте хотя бы один вопрос',
  };

  return map[error] ?? error;
}
