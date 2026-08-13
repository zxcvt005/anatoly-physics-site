import 'server-only';

import * as XLSX from 'xlsx';
import {
  formatLessonDateInMoscow,
  formatLessonStartTime,
} from '@/lib/lesson-datetime';
import { isLessonChargeable } from '@/lib/lesson-utils';
import { computeStudentProgressStats, formatAverageHomeworkPercent } from '@/lib/student-progress';
import {
  formatAttendance,
  formatDate,
  formatMoney,
  WEEKDAY_LABELS,
} from '@/lib/tutor-calculations';
import { formatLessonHomeworkLabel } from '@/lib/tests/homework-display';
import type { Student } from '@/types/tutor';
import type { CrmExportData } from './fetch-export-data';
import { fetchCrmExportData } from './fetch-export-data';
import {
  activityStatusLabels,
  formatYesNo,
  intensiveStatusLabels,
  lessonStatusLabels,
  lessonTypeLabels,
  paymentStatusLabels,
  trialCallStatusLabels,
} from './labels';
import { appendSheet } from './sheet-utils';

export type CrmExportWorkbookResult =
  | { ok: true; data: Buffer }
  | { ok: false; error: string };

function formatStartedAt(value: string | null | undefined): string {
  if (!value) return '—';
  return formatDate(value.slice(0, 10));
}

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  if (!year || !month) return monthKey;

  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function buildStudentNameMap(students: Student[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const student of students) {
    map.set(student.id, student.name);
  }
  return map;
}

function buildStudentPortalUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/student/${token}`;
}

function formatLessonRelation(lesson: CrmExportData['lessons'][number]): string {
  const parts: string[] = [];

  if (lesson.makeupForLessonId) {
    parts.push(`Отработка за занятие ${lesson.makeupForLessonId}`);
  }

  if (lesson.transferredFromLessonId) {
    parts.push(`Перенесено с занятия ${lesson.transferredFromLessonId}`);
  }

  if (lesson.transferredToLessonId) {
    parts.push(`Перенесено на занятие ${lesson.transferredToLessonId}`);
  }

  if (lesson.transferComment?.trim()) {
    parts.push(lesson.transferComment.trim());
  }

  return parts.length > 0 ? parts.join('; ') : '—';
}

function buildStudentsSheet(
  data: CrmExportData,
  origin: string,
): unknown[][] {
  const header = [
    'ID ученика',
    'Имя',
    'Фамилия',
    'Класс',
    'Ставка за 4 недели',
    'Занятий в неделю',
    'Расчётная ставка за занятие',
    'Статус',
    'Комментарий к паузе',
    'Контакты родителей',
    'Ссылка на студентку',
    'Дата начала обучения',
  ];

  const rows = data.students.map((student) => [
    student.id,
    student.firstName,
    student.lastName,
    student.gradeClass,
    formatMoney(student.rate4Weeks),
    student.lessonsPerWeek,
    formatMoney(student.ratePerLesson),
    activityStatusLabels[student.activityStatus ?? 'active'],
    student.pauseComment ?? '—',
    student.parentContacts ?? '—',
    buildStudentPortalUrl(origin, student.token),
    formatStartedAt(data.startedAtByStudentId.get(student.id)),
  ]);

  return [header, ...rows];
}

function buildPaymentsSheet(
  data: CrmExportData,
  studentNames: Map<string, string>,
): unknown[][] {
  const header = [
    'Дата оплаты',
    'Ученик',
    'Сумма',
    'Статус',
    'Комментарий',
    'Учтено в налогах',
  ];

  const rows = data.payments.map((payment) => [
    formatDate(payment.createdAt.slice(0, 10)),
    studentNames.get(payment.studentId) ?? payment.studentId,
    formatMoney(payment.amount),
    paymentStatusLabels[payment.status],
    payment.note ?? '—',
    formatYesNo(payment.taxAccounted),
  ]);

  return [header, ...rows];
}

function buildLessonsSheet(
  data: CrmExportData,
  studentNames: Map<string, string>,
): unknown[][] {
  const header = [
    'Дата',
    'Время начала',
    'Время окончания',
    'Ученик',
    'Тип занятия',
    'Статус',
    'Посещение',
    'Тема',
    'Результат ДЗ',
    'Списывает оплату',
    'Комментарий',
    'Связь с отработкой / переносом',
  ];

  const rows = data.lessons.map((lesson) => [
    formatLessonDateInMoscow(lesson.date, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    formatLessonStartTime(lesson.date),
    lesson.endTime ?? '—',
    studentNames.get(lesson.studentId) ?? lesson.studentId,
    lessonTypeLabels[lesson.lessonType],
    lessonStatusLabels[lesson.status],
    formatAttendance(lesson.attendance),
    lesson.topic ?? '—',
    formatLessonHomeworkLabel(lesson),
    formatYesNo(isLessonChargeable(lesson)),
    lesson.comment ?? '—',
    formatLessonRelation(lesson),
  ]);

  return [header, ...rows];
}

function buildScheduleSheet(
  data: CrmExportData,
  studentNames: Map<string, string>,
): unknown[][] {
  const header = [
    'День недели',
    'Время начала',
    'Время окончания',
    'Ученики в слоте',
    'Количество учеников',
    'Комментарий',
  ];

  const rows = data.scheduleSlots.map((slot) => {
    const studentLabels = slot.studentIds.map(
      (id) => studentNames.get(id) ?? id,
    );

    return [
      WEEKDAY_LABELS[slot.weekday] ?? String(slot.weekday),
      slot.startTime,
      slot.endTime,
      studentLabels.join(', ') || '—',
      slot.studentIds.length,
      slot.comment ?? '—',
    ];
  });

  return [header, ...rows];
}

function buildIntensivesSheet(
  data: CrmExportData,
  studentNames: Map<string, string>,
): unknown[][] {
  const intensiveTitles = new Map(
    data.intensivesBundle.intensives.map((item) => [item.id, item.title]),
  );

  const header = ['Ученик', 'Интенсив', 'Статус'];

  const rows = data.intensivesBundle.progress.map((entry) => [
    studentNames.get(entry.studentId) ?? entry.studentId,
    intensiveTitles.get(entry.intensiveId) ?? entry.intensiveId,
    intensiveStatusLabels[entry.status],
  ]);

  return [header, ...rows];
}

function buildTrialLessonsSheet(
  data: CrmExportData,
  studentNames: Map<string, string>,
): unknown[][] {
  const header = [
    'Дата пробного',
    'Имя',
    'Фамилия',
    'Класс',
    'Цель',
    'Текущий результат',
    'Предложенная ставка за 4 недели',
    'Предложенное количество занятий в неделю',
    'Контакты родителей',
    'Статус созвона',
    'Комментарий',
    'Связанный ученик',
  ];

  const rows = data.trialLessons.map((trial) => [
    formatDate(trial.trialDate),
    trial.firstName,
    trial.lastName,
    trial.gradeClass,
    trial.goal,
    trial.currentResult,
    formatMoney(trial.proposedRate4Weeks),
    trial.proposedLessonsPerWeek,
    trial.parentContacts,
    trialCallStatusLabels[trial.callStatus],
    trial.comment ?? '—',
    trial.linkedStudentId
      ? (studentNames.get(trial.linkedStudentId) ?? trial.linkedStudentId)
      : '—',
  ]);

  return [header, ...rows];
}

function buildRevenueSheet(data: CrmExportData): unknown[][] {
  const header = [
    'Месяц',
    'Потенциальный доход',
    'Полученный доход',
    'Дата фиксации',
  ];

  const rows = [...data.revenueSnapshots]
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .map((snapshot) => [
      formatMonthKey(snapshot.monthKey),
      formatMoney(snapshot.potentialIncome),
      formatMoney(snapshot.receivedIncome),
      formatDate(snapshot.frozenAt.slice(0, 10)),
    ]);

  return [header, ...rows];
}

function buildSummarySheet(data: CrmExportData): unknown[][] {
  const activeStudents = data.students.filter(
    (student) => (student.activityStatus ?? 'active') === 'active',
  ).length;
  const pausedStudents = data.students.filter(
    (student) => student.activityStatus === 'paused',
  ).length;

  const confirmedPaymentsTotal = data.payments
    .filter((payment) => payment.status === 'confirmed')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const pendingPaymentsTotal = data.payments
    .filter((payment) => payment.status === 'pending')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const completedLessons = data.lessons.filter(
    (lesson) => lesson.status === 'completed',
  ).length;

  const absences = data.lessons.filter(
    (lesson) => lesson.attendance === 'absent',
  ).length;

  const progress = computeStudentProgressStats(data.lessons);

  const averageHomeworkPercent =
    progress.averageHomeworkPercent !== null
      ? formatAverageHomeworkPercent(progress.averageHomeworkPercent)
      : '—';

  const agreedTrials = data.trialLessons.filter(
    (trial) => trial.callStatus === 'agreed',
  ).length;
  const rejectedTrials = data.trialLessons.filter(
    (trial) => trial.callStatus === 'not_agreed',
  ).length;

  return [
    ['Показатель', 'Значение'],
    ['Количество учеников всего', data.students.length],
    ['Активных учеников', activeStudents],
    ['Учеников на паузе', pausedStudents],
    ['Общая сумма подтверждённых оплат', formatMoney(confirmedPaymentsTotal)],
    ['Сумма ожидающих оплат', formatMoney(pendingPaymentsTotal)],
    ['Количество проведённых занятий', completedLessons],
    ['Количество пропусков', absences],
    ['Средний результат за ДЗ', averageHomeworkPercent],
    ['Количество интенсивов', data.intensivesBundle.intensives.length],
    ['Количество пробных', data.trialLessons.length],
    ['Количество договорившихся после пробного', agreedTrials],
    ['Количество отказов после пробного', rejectedTrials],
  ];
}

export async function buildCrmExportWorkbook(
  origin: string,
): Promise<CrmExportWorkbookResult> {
  const dataResult = await fetchCrmExportData();

  if (!dataResult.ok) {
    return dataResult;
  }

  const data = dataResult.data;
  const studentNames = buildStudentNameMap(data.students);
  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, 'Ученики', buildStudentsSheet(data, origin));
  appendSheet(workbook, 'Оплаты', buildPaymentsSheet(data, studentNames));
  appendSheet(workbook, 'Занятия', buildLessonsSheet(data, studentNames));
  appendSheet(workbook, 'Расписание', buildScheduleSheet(data, studentNames));
  appendSheet(workbook, 'Интенсивы', buildIntensivesSheet(data, studentNames));
  appendSheet(
    workbook,
    'Пробные уроки',
    buildTrialLessonsSheet(data, studentNames),
  );
  appendSheet(workbook, 'Доходы по месяцам', buildRevenueSheet(data));
  appendSheet(workbook, 'Сводка', buildSummarySheet(data));

  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  }) as Buffer;

  return { ok: true, data: buffer };
}

export function getCrmExportFilename(date = new Date()): string {
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
  }).format(date);

  return `crm-report-${dateKey}.xlsx`;
}

export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host') ?? url.host;
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto ?? url.protocol.replace(':', '');

  return `${protocol}://${host}`;
}
