import { normalizeLesson } from '@/lib/lesson-utils';
import type {
  Intensive,
  Lesson,
  Payment,
  RevenueMonthSnapshot,
  ScheduleSlot,
  Student,
  StudentIntensiveProgress,
  TrialLesson,
  WeeklyScheduleSlot,
} from '@/types/tutor';

function lesson(data: Omit<Lesson, 'lessonType' | 'isOutsideSchedule'> & {
  lessonType?: Lesson['lessonType'];
  isOutsideSchedule?: boolean;
}): Lesson {
  return normalizeLesson({
    lessonType: 'regular',
    isOutsideSchedule: false,
    makeupStatus: 'none',
    ...data,
  });
}

export const students: Student[] = [
  {
    id: 's1',
    firstName: 'Алексей',
    lastName: 'Смирнов',
    name: 'Алексей Смирнов',
    gradeClass: '11',
    token: 'smirnov2024',
    rate4Weeks: 20000,
    lessonsPerWeek: 2,
    ratePerLesson: 2500,
  },
  {
    id: 's2',
    firstName: 'Мария',
    lastName: 'Козлова',
    name: 'Мария Козлова',
    gradeClass: '10',
    token: 'kozlova2024',
    rate4Weeks: 24000,
    lessonsPerWeek: 2,
    ratePerLesson: 3000,
  },
  {
    id: 's3',
    firstName: 'Дмитрий',
    lastName: 'Волков',
    name: 'Дмитрий Волков',
    gradeClass: '9',
    token: 'volkov2024',
    rate4Weeks: 22400,
    lessonsPerWeek: 2,
    ratePerLesson: 2800,
  },
  {
    id: 's4',
    firstName: 'Анна',
    lastName: 'Петрова',
    name: 'Анна Петрова',
    gradeClass: '11',
    token: 'petrova2024',
    rate4Weeks: 20000,
    lessonsPerWeek: 2,
    ratePerLesson: 2500,
    parentContacts: 'мама: +7 916 111-22-33',
  },
  {
    id: 's5',
    firstName: 'София',
    lastName: 'Морозова',
    name: 'София Морозова',
    gradeClass: '9',
    token: 'morozova2026',
    rate4Weeks: 16000,
    lessonsPerWeek: 1,
    ratePerLesson: 4000,
    parentContacts: 'папа: +7 903 555-12-12',
  },
];

export const trialLessons: TrialLesson[] = [
  {
    id: 'trial-1',
    firstName: 'Игорь',
    lastName: 'Новиков',
    trialDate: '2026-06-12',
    gradeClass: '10',
    goal: 'Подготовка к ЕГЭ по физике',
    currentResult: '62 балла на пробнике',
    proposedRate4Weeks: 20000,
    proposedLessonsPerWeek: 2,
    parentContacts: '+7 900 123-45-67, Telegram @novikov_mama',
    callStatus: 'not_called',
    comment: 'Пришёл с рекомендацией от Козловой',
    createdAt: '2026-06-04T10:00:00',
  },
  {
    id: 'trial-2',
    firstName: 'София',
    lastName: 'Морозова',
    trialDate: '2026-05-28',
    gradeClass: '9',
    goal: 'Улучшить оценку в школе',
    currentResult: 'тройка за четверть',
    proposedRate4Weeks: 16000,
    proposedLessonsPerWeek: 1,
    parentContacts: 'папа: +7 903 555-12-12',
    callStatus: 'agreed',
    comment: 'Договорились на 1 занятие в неделю, старт со следующей недели',
    linkedStudentId: 's5',
    createdAt: '2026-05-20T14:00:00',
  },
];

export const payments: Payment[] = [
  {
    id: 'p1',
    studentId: 's1',
    amount: 10000,
    status: 'confirmed',
    createdAt: '2026-05-10T10:00:00',
    note: 'Перевод на карту',
    taxAccounted: true,
  },
  {
    id: 'p2',
    studentId: 's1',
    amount: 5000,
    status: 'pending',
    createdAt: '2026-06-06T18:30:00',
    note: 'Заявка от родителя',
  },
  {
    id: 'p3',
    studentId: 's2',
    amount: 12000,
    status: 'confirmed',
    createdAt: '2026-05-20T12:00:00',
    taxAccounted: true,
  },
  {
    id: 'p4',
    studentId: 's2',
    amount: 6000,
    status: 'pending',
    createdAt: '2026-06-07T09:15:00',
    note: 'СБП',
  },
  {
    id: 'p5',
    studentId: 's3',
    amount: 8400,
    status: 'confirmed',
    createdAt: '2026-05-15T14:00:00',
    taxAccounted: false,
  },
  {
    id: 'p6',
    studentId: 's4',
    amount: 7500,
    status: 'confirmed',
    createdAt: '2026-05-25T11:00:00',
    taxAccounted: false,
  },
  {
    id: 'p8',
    studentId: 's1',
    amount: 10000,
    status: 'confirmed',
    createdAt: '2026-06-03T11:00:00',
    note: 'Июньская оплата',
    taxAccounted: false,
  },
  {
    id: 'p7',
    studentId: 's4',
    amount: 2500,
    status: 'rejected',
    createdAt: '2026-05-28T16:00:00',
    note: 'Неверная сумма',
  },
];

export const revenueMonthSnapshots: RevenueMonthSnapshot[] = [
  {
    monthKey: '2026-05',
    potentialIncome: 82000,
    receivedIncome: 37900,
    frozenAt: '2026-06-01T00:00:00',
  },
];

export const lessons: Lesson[] = [
  lesson({
    id: 'l1',
    studentId: 's1',
    date: '2026-05-12T18:00:00',
    status: 'completed',
    paymentStatus: 'paid',
    topic: 'Кинематика: равномерное движение',
    attendance: 'present',
    homeworkStatus: 'done',
    homeworkScore: 9,
    isChargeable: true,
  }),
  lesson({
    id: 'l2',
    studentId: 's1',
    date: '2026-05-19T18:00:00',
    status: 'completed',
    paymentStatus: 'paid',
    topic: 'Кинематика: равноускоренное движение',
    attendance: 'present',
    homeworkStatus: 'partial',
    homeworkScore: 6,
    isChargeable: true,
  }),
  lesson({
    id: 'l3',
    studentId: 's1',
    date: '2026-05-26T18:00:00',
    status: 'completed',
    paymentStatus: 'paid',
    topic: 'Динамика: законы Ньютона',
    attendance: 'late',
    homeworkStatus: 'done',
    homeworkScore: 8,
    isChargeable: true,
  }),
  lesson({
    id: 'l4',
    studentId: 's1',
    date: '2026-06-02T18:00:00',
    status: 'completed',
    paymentStatus: 'paid',
    topic: 'Силы трения и упругости',
    attendance: 'present',
    homeworkStatus: 'not_done',
    homeworkScore: 3,
    isChargeable: true,
  }),
  lesson({
    id: 'l7',
    studentId: 's2',
    date: '2026-06-01T17:00:00',
    status: 'completed',
    paymentStatus: 'paid',
    topic: 'Электростатика: закон Кулона',
    attendance: 'present',
    homeworkStatus: 'done',
    homeworkScore: 10,
    isChargeable: true,
  }),
  lesson({
    id: 'l10',
    studentId: 's3',
    date: '2026-06-05T19:00:00',
    status: 'completed',
    paymentStatus: 'paid',
    topic: 'Механические колебания',
    attendance: 'present',
    homeworkStatus: 'done',
    homeworkScore: 7,
    isChargeable: true,
  }),
  lesson({
    id: 'l13',
    studentId: 's4',
    date: '2026-05-30T16:00:00',
    status: 'completed',
    paymentStatus: 'paid',
    topic: 'Оптика: отражение и преломление',
    attendance: 'present',
    homeworkStatus: 'done',
    homeworkScore: 8,
    isChargeable: true,
  }),
  lesson({
    id: 'l14',
    studentId: 's4',
    date: '2026-06-06T16:00:00',
    status: 'completed',
    paymentStatus: 'unpaid',
    topic: 'Линзы и оптические приборы',
    attendance: 'absent',
    homeworkStatus: 'not_done',
    homeworkScore: 0,
    isChargeable: false,
    makeupStatus: 'none',
  }),
];

export const scheduleSlots: WeeklyScheduleSlot[] = [
  {
    id: 'slot-mon-1',
    weekday: 1,
    startTime: '17:00',
    endTime: '18:00',
    studentIds: ['s2'],
  },
  {
    id: 'slot-mon-2',
    weekday: 1,
    startTime: '18:00',
    endTime: '19:00',
    studentIds: ['s1', 's3'],
  },
  {
    id: 'slot-tue-1',
    weekday: 2,
    startTime: '18:00',
    endTime: '19:00',
    studentIds: ['s1'],
  },
  {
    id: 'slot-wed-1',
    weekday: 3,
    startTime: '17:15',
    endTime: '18:15',
    studentIds: ['s2', 's4'],
  },
  {
    id: 'slot-thu-1',
    weekday: 4,
    startTime: '19:00',
    endTime: '20:00',
    studentIds: ['s3'],
  },
  {
    id: 'slot-fri-1',
    weekday: 5,
    startTime: '16:00',
    endTime: '17:00',
    studentIds: ['s4'],
  },
  {
    id: 'slot-sat-1',
    weekday: 6,
    startTime: '16:00',
    endTime: '17:00',
    studentIds: ['s4'],
  },
  {
    id: 'slot-sun-1',
    weekday: 0,
    startTime: '16:00',
    endTime: '17:00',
    studentIds: ['s4'],
  },
  {
    id: 'slot-sun-2',
    weekday: 0,
    startTime: '17:00',
    endTime: '18:00',
    studentIds: ['s2'],
  },
  {
    id: 'slot-sun-3',
    weekday: 0,
    startTime: '17:15',
    endTime: '18:15',
    studentIds: ['s2', 's4'],
  },
  {
    id: 'slot-sun-4',
    weekday: 0,
    startTime: '19:00',
    endTime: '20:00',
    studentIds: ['s3'],
  },
];

function compareByStartTime(
  a: WeeklyScheduleSlot,
  b: WeeklyScheduleSlot,
): number {
  return a.startTime.localeCompare(b.startTime);
}

export function getSlotsForWeekday(weekday: number): WeeklyScheduleSlot[] {
  return scheduleSlots
    .filter((slot) => slot.weekday === weekday)
    .sort(compareByStartTime);
}

export function getSlotsForToday(): WeeklyScheduleSlot[] {
  return getSlotsForWeekday(new Date().getDay());
}

export function getStudentByToken(token: string): Student | undefined {
  return students.find((s) => s.token === token);
}

export function getStudentById(id: string): Student | undefined {
  return students.find((s) => s.id === id);
}

export function getScheduleForStudent(studentId: string): ScheduleSlot[] {
  const dayOrder = (day: number) => (day === 0 ? 7 : day);

  return scheduleSlots
    .filter((slot) => slot.studentIds.includes(studentId))
    .map((slot) => ({
      id: `${slot.id}-${studentId}`,
      studentId,
      dayOfWeek: slot.weekday,
      time: slot.startTime,
    }))
    .sort((a, b) => dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek));
}

export function getLessonsForStudent(studentId: string): Lesson[] {
  return lessons
    .filter((l) => l.studentId === studentId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPaymentsForStudent(studentId: string): Payment[] {
  return payments
    .filter((p) => p.studentId === studentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getPendingPayments(): Payment[] {
  return payments
    .filter((p) => p.status === 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getRecentLessons(limit = 10): Lesson[] {
  return [...lessons]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export const intensives: Intensive[] = [
  { id: 'int-1', title: 'Механика в тестовой' },
  { id: 'int-2', title: 'МКТ в тестовой' },
  { id: 'int-3', title: 'Вторая часть 22, 26' },
  { id: 'int-4', title: 'Электричество' },
];

export const studentIntensiveProgress: StudentIntensiveProgress[] = [
  { studentId: 's1', intensiveId: 'int-1', status: 'completed' },
  { studentId: 's1', intensiveId: 'int-2', status: 'in_progress' },
  { studentId: 's1', intensiveId: 'int-3', status: 'not_started' },
  { studentId: 's2', intensiveId: 'int-1', status: 'in_progress' },
  { studentId: 's2', intensiveId: 'int-4', status: 'completed' },
  { studentId: 's3', intensiveId: 'int-2', status: 'completed' },
  { studentId: 's3', intensiveId: 'int-3', status: 'in_progress' },
  { studentId: 's4', intensiveId: 'int-1', status: 'not_started' },
  { studentId: 's4', intensiveId: 'int-4', status: 'in_progress' },
];

export function getLessonsForToday(): Lesson[] {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  return lessons
    .filter((l) => l.date.startsWith(todayStr))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
