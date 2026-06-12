import { isStudentPaused } from '@/lib/student-utils';
import {
  MANY_ABSENCES_THRESHOLD,
  type StudentAdminRowStats,
  type StudentAdminStatus,
} from '@/lib/student-admin-stats';
import type { Student, WeeklyScheduleSlot } from '@/types/tutor';

export type StudentAdminFilterId =
  | 'all'
  | 'active'
  | 'paused'
  | 'no_schedule'
  | 'negative_balance'
  | 'pending_payment'
  | 'many_absences';

export const STUDENT_ADMIN_FILTER_OPTIONS: {
  id: StudentAdminFilterId;
  label: string;
}[] = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'paused', label: 'На паузе' },
  { id: 'no_schedule', label: 'Нет расписания' },
  { id: 'negative_balance', label: 'В минусе' },
  { id: 'pending_payment', label: 'Ожидают оплату' },
  { id: 'many_absences', label: 'Много пропусков' },
];

export interface StudentAdminTableRow {
  student: Student;
  stats: StudentAdminRowStats;
  statuses: StudentAdminStatus[];
}

export function getScheduledStudentIds(
  slots: WeeklyScheduleSlot[],
): Set<string> {
  const ids = new Set<string>();

  for (const slot of slots) {
    for (const studentId of slot.studentIds) {
      ids.add(studentId);
    }
  }

  return ids;
}

export function matchesStudentSearch(
  student: Student,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    student.firstName,
    student.lastName,
    student.name,
    student.gradeClass,
    student.parentContacts ?? '',
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

export function matchesStudentAdminFilter(
  row: StudentAdminTableRow,
  filterId: StudentAdminFilterId,
  scheduledStudentIds: Set<string>,
): boolean {
  switch (filterId) {
    case 'all':
      return true;
    case 'active':
      return !isStudentPaused(row.student);
    case 'paused':
      return isStudentPaused(row.student);
    case 'no_schedule':
      return !scheduledStudentIds.has(row.student.id);
    case 'negative_balance':
      return row.stats.remainingLessons < 0;
    case 'pending_payment':
      return row.statuses.some((status) => status.id === 'pending_payment');
    case 'many_absences':
      return row.stats.absencesCount >= MANY_ABSENCES_THRESHOLD;
    default:
      return true;
  }
}

export function filterStudentAdminRows(
  rows: StudentAdminTableRow[],
  query: string,
  filterId: StudentAdminFilterId,
  scheduledStudentIds: Set<string>,
): StudentAdminTableRow[] {
  return rows.filter(
    (row) =>
      matchesStudentSearch(row.student, query) &&
      matchesStudentAdminFilter(row, filterId, scheduledStudentIds),
  );
}
