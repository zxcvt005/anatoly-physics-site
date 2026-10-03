import type { ExpenseMonthStudentSnapshot } from '@/lib/expenses/month-snapshots';
import type { ExpenseMonthSnapshotRow } from '@/lib/supabase/expenses/month-snapshot-types';

export function mapExpenseMonthSnapshotRow(
  row: ExpenseMonthSnapshotRow,
): ExpenseMonthStudentSnapshot {
  return {
    monthKey: row.month_key,
    studentCount: row.student_count,
    finalized: row.finalized,
  };
}

export function mapExpenseMonthSnapshotRows(
  rows: ExpenseMonthSnapshotRow[] | null,
): ExpenseMonthStudentSnapshot[] {
  return (rows ?? []).map(mapExpenseMonthSnapshotRow);
}
