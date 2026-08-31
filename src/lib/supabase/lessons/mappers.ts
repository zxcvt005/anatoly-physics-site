import { normalizeLesson } from '@/lib/lesson-utils';
import { normalizeCrmDateInput } from '@/lib/crm-datetime';
import type { Lesson } from '@/types/tutor';
import type { LessonRow, LessonWithStudentRow } from './types';

function formatTimeFromDb(time: string): string {
  return time.slice(0, 5);
}

function toDbTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function extractStudentAppId(
  students: LessonWithStudentRow['students'],
): string | undefined {
  if (!students) {
    return undefined;
  }

  if (Array.isArray(students)) {
    return students[0]?.app_id;
  }

  return students.app_id;
}

function extractTopicAppId(
  topics: LessonWithStudentRow['lesson_topics'],
): { appId?: string; title?: string } {
  if (!topics) return {};
  const row = Array.isArray(topics) ? topics[0] : topics;
  if (!row) return {};
  return { appId: row.app_id, title: row.title };
}

export function lessonRowToLesson(
  row: LessonWithStudentRow,
  lessonAppIdByUuid: Map<string, string>,
): Lesson | null {
  const studentId = extractStudentAppId(row.students);

  if (!studentId) {
    return null;
  }

  const topicInfo = extractTopicAppId(row.lesson_topics);

  return normalizeLesson({
    id: row.app_id,
    studentId,
    date: normalizeCrmDateInput(row.lesson_at),
    endTime: row.end_time ? formatTimeFromDb(row.end_time) : undefined,
    status: row.status,
    paymentStatus: row.payment_status,
    lessonType: row.lesson_type,
    isOutsideSchedule: row.is_outside_schedule,
    makeupForLessonId: row.makeup_for_lesson_id
      ? lessonAppIdByUuid.get(row.makeup_for_lesson_id)
      : undefined,
    makeupStatus: row.makeup_status,
    isChargeable: row.is_chargeable ?? undefined,
    isUnexcusedAbsence: row.is_unexcused_absence ?? false,
    topic: row.topic ?? topicInfo.title ?? undefined,
    lessonTopicId: topicInfo.appId,
    attendance: row.attendance ?? undefined,
    homeworkStatus: row.homework_status ?? undefined,
    homeworkScore: row.homework_score ?? undefined,
    homeworkPointsEarned:
      row.homework_points_earned !== null
        ? Number(row.homework_points_earned)
        : undefined,
    homeworkPointsMax:
      row.homework_points_max !== null ? Number(row.homework_points_max) : undefined,
    homeworkPercent:
      row.homework_percent !== null ? Number(row.homework_percent) : undefined,
    comment: row.comment ?? undefined,
    transferredToLessonId: row.transferred_to_lesson_id
      ? lessonAppIdByUuid.get(row.transferred_to_lesson_id)
      : undefined,
    transferredFromLessonId: row.transferred_from_lesson_id
      ? lessonAppIdByUuid.get(row.transferred_from_lesson_id)
      : undefined,
    transferComment: row.transfer_comment ?? undefined,
  });
}

export function mapLessonRows(
  rows: LessonWithStudentRow[] | null,
  lessonAppIdByUuid: Map<string, string>,
): Lesson[] {
  return (rows ?? [])
    .map((row) => lessonRowToLesson(row, lessonAppIdByUuid))
    .filter((lesson): lesson is Lesson => lesson !== null);
}

export function lessonToUpsertRow(
  lesson: Lesson,
  studentUuid: string,
  lessonUuidByAppId: Map<string, string>,
  topicUuidByAppId: Map<string, string> = new Map(),
) {
  const normalized = normalizeLesson(lesson);

  return {
    app_id: normalized.id,
    student_id: studentUuid,
    lesson_at: normalized.date,
    end_time: normalized.endTime ? toDbTime(normalized.endTime) : null,
    status: normalized.status,
    payment_status: normalized.paymentStatus,
    lesson_type: normalized.lessonType,
    is_outside_schedule: normalized.isOutsideSchedule,
    makeup_for_lesson_id: normalized.makeupForLessonId
      ? lessonUuidByAppId.get(normalized.makeupForLessonId) ?? null
      : null,
    makeup_status: normalized.makeupStatus ?? 'none',
    is_chargeable: normalized.isChargeable ?? null,
    is_unexcused_absence: normalized.isUnexcusedAbsence ?? false,
    topic: normalized.topic ?? null,
    lesson_topic_id: normalized.lessonTopicId
      ? topicUuidByAppId.get(normalized.lessonTopicId) ?? null
      : null,
    attendance: normalized.attendance ?? null,
    homework_status: normalized.homeworkStatus ?? null,
    homework_score: normalized.homeworkScore ?? null,
    homework_points_earned: normalized.homeworkPointsEarned ?? null,
    homework_points_max: normalized.homeworkPointsMax ?? null,
    homework_percent: normalized.homeworkPercent ?? null,
    comment: normalized.comment ?? null,
    transferred_to_lesson_id: normalized.transferredToLessonId
      ? lessonUuidByAppId.get(normalized.transferredToLessonId) ?? null
      : null,
    transferred_from_lesson_id: normalized.transferredFromLessonId
      ? lessonUuidByAppId.get(normalized.transferredFromLessonId) ?? null
      : null,
    transfer_comment: normalized.transferComment ?? null,
  };
}

export function lessonPatchToUpdateRow(
  patch: Partial<Lesson>,
  lessonUuidByAppId: Map<string, string>,
  topicUuidByAppId: Map<string, string> = new Map(),
): Partial<LessonRow> {
  const row: Partial<LessonRow> = {};

  if (patch.date !== undefined) row.lesson_at = patch.date;
  if (patch.endTime !== undefined) {
    row.end_time = patch.endTime ? toDbTime(patch.endTime) : null;
  }
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.paymentStatus !== undefined) row.payment_status = patch.paymentStatus;
  if (patch.lessonType !== undefined) row.lesson_type = patch.lessonType;
  if (patch.isOutsideSchedule !== undefined) {
    row.is_outside_schedule = patch.isOutsideSchedule;
  }
  if (patch.makeupStatus !== undefined) row.makeup_status = patch.makeupStatus;
  if (patch.isChargeable !== undefined) row.is_chargeable = patch.isChargeable;
  if (patch.isUnexcusedAbsence !== undefined) {
    row.is_unexcused_absence = patch.isUnexcusedAbsence;
  }
  if (patch.topic !== undefined) row.topic = patch.topic ?? null;
  if (patch.lessonTopicId !== undefined) {
    row.lesson_topic_id = patch.lessonTopicId
      ? topicUuidByAppId.get(patch.lessonTopicId) ?? null
      : null;
  }
  if (patch.attendance !== undefined) row.attendance = patch.attendance ?? null;
  if (patch.homeworkStatus !== undefined) {
    row.homework_status = patch.homeworkStatus ?? null;
  }
  if (patch.homeworkScore !== undefined) {
    row.homework_score = patch.homeworkScore ?? null;
  }
  if (patch.homeworkPointsEarned !== undefined) {
    row.homework_points_earned = patch.homeworkPointsEarned ?? null;
  }
  if (patch.homeworkPointsMax !== undefined) {
    row.homework_points_max = patch.homeworkPointsMax ?? null;
  }
  if (patch.homeworkPercent !== undefined) {
    row.homework_percent = patch.homeworkPercent ?? null;
  }
  if (patch.comment !== undefined) row.comment = patch.comment ?? null;
  if (patch.transferComment !== undefined) {
    row.transfer_comment = patch.transferComment ?? null;
  }
  if (patch.makeupForLessonId !== undefined) {
    row.makeup_for_lesson_id = patch.makeupForLessonId
      ? lessonUuidByAppId.get(patch.makeupForLessonId) ?? null
      : null;
  }
  if (patch.transferredToLessonId !== undefined) {
    row.transferred_to_lesson_id = patch.transferredToLessonId
      ? lessonUuidByAppId.get(patch.transferredToLessonId) ?? null
      : null;
  }
  if (patch.transferredFromLessonId !== undefined) {
    row.transferred_from_lesson_id = patch.transferredFromLessonId
      ? lessonUuidByAppId.get(patch.transferredFromLessonId) ?? null
      : null;
  }

  return row;
}
