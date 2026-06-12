import type {
  Intensive,
  IntensiveStatus,
  StudentIntensiveProgress,
} from '@/types/tutor';
import type {
  IntensiveRow,
  StudentIntensiveProgressWithAppIdsRow,
} from './types';

function extractAppId(
  relation: { app_id: string } | { app_id: string }[] | null | undefined,
): string | undefined {
  if (!relation) {
    return undefined;
  }

  if (Array.isArray(relation)) {
    return relation[0]?.app_id;
  }

  return relation.app_id;
}

export function intensiveRowToIntensive(row: IntensiveRow): Intensive {
  return {
    id: row.app_id,
    title: row.title,
  };
}

export function mapIntensiveRows(rows: IntensiveRow[] | null): Intensive[] {
  return (rows ?? []).map(intensiveRowToIntensive);
}

export function intensiveToInsertRow(intensive: Intensive) {
  return {
    app_id: intensive.id,
    title: intensive.title,
  };
}

export function progressRowToStudentIntensiveProgress(
  row: StudentIntensiveProgressWithAppIdsRow,
): StudentIntensiveProgress | null {
  const studentId = extractAppId(row.students);
  const intensiveId = extractAppId(row.intensives);

  if (!studentId || !intensiveId) {
    return null;
  }

  return {
    studentId,
    intensiveId,
    status: row.status,
  };
}

export function mapProgressRows(
  rows: StudentIntensiveProgressWithAppIdsRow[] | null,
): StudentIntensiveProgress[] {
  return (rows ?? [])
    .map(progressRowToStudentIntensiveProgress)
    .filter((entry): entry is StudentIntensiveProgress => entry !== null);
}

export function isStoredProgressStatus(status: IntensiveStatus): boolean {
  return status !== 'not_started';
}
