'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  handleStartTimeChange,
  isHmTimeRangeValid,
} from '@/lib/crm-time-utils';
import { formatStudentCheckboxLabel } from '@/lib/schedule-utils';
import { WEEKDAY_LABELS } from '@/lib/tutor-calculations';
import type { WeeklyScheduleSlotInput } from '@/providers/ScheduleSlotsProvider';
import type { Student, WeeklyScheduleSlot } from '@/types/tutor';

interface AdminSlotEditorModalProps {
  open: boolean;
  slot: WeeklyScheduleSlot | null;
  defaultWeekday?: number;
  students: Student[];
  onClose: () => void;
  onSave: (data: WeeklyScheduleSlotInput) => void;
}

export function AdminSlotEditorModal({
  open,
  slot,
  defaultWeekday = 1,
  students,
  onClose,
  onSave,
}: AdminSlotEditorModalProps) {
  const [weekday, setWeekday] = useState(defaultWeekday);
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('18:00');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [studentQuery, setStudentQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setWeekday(slot?.weekday ?? defaultWeekday);
    setStartTime(slot?.startTime ?? '17:00');
    setEndTime(slot?.endTime ?? '18:00');
    setStudentIds(slot?.studentIds ?? []);
    setComment(slot?.comment ?? '');
    setStudentQuery('');
  }, [open, slot, defaultWeekday]);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      student.name.toLowerCase().includes(query),
    );
  }, [students, studentQuery]);

  if (!open) return null;

  const isEditing = Boolean(slot);
  const canSave = Boolean(startTime && endTime && isHmTimeRangeValid(startTime, endTime));

  const toggleStudent = (studentId: string) => {
    setStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;

    onSave({
      weekday,
      startTime,
      endTime,
      studentIds,
      comment: comment.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Редактировать слот' : 'Новый слот'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div>
            <label
              htmlFor="slot-weekday"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              День недели
            </label>
            <select
              id="slot-weekday"
              value={weekday}
              onChange={(event) => setWeekday(Number(event.target.value))}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            >
              {([1, 2, 3, 4, 5, 6, 0] as const).map((day) => (
                <option key={day} value={day}>
                  {WEEKDAY_LABELS[day]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="slot-start"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Время начала
              </label>
              <input
                id="slot-start"
                type="time"
                value={startTime}
                onChange={(event) =>
                  handleStartTimeChange(
                    event.target.value,
                    setStartTime,
                    setEndTime,
                  )
                }
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
              />
            </div>
            <div>
              <label
                htmlFor="slot-end"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Время окончания
              </label>
              <input
                id="slot-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
              />
            </div>
          </div>

          {!canSave && startTime && endTime && !isHmTimeRangeValid(startTime, endTime) && (
            <p className="text-xs text-red-400">
              Время окончания должно быть позже начала
            </p>
          )}

          <div>
            <label
              htmlFor="slot-student-search"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Ученики
            </label>
            <input
              id="slot-student-search"
              type="text"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder="Поиск по имени…"
              className="mb-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
              {filteredStudents.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-zinc-500">
                  Ученики не найдены
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
                  >
                    <input
                      type="checkbox"
                      checked={studentIds.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="h-4 w-4 rounded border-zinc-600 accent-[#3166F0]"
                    />
                    {formatStudentCheckboxLabel(student)}
                  </label>
                ))
              )}
            </div>
            {studentIds.length > 0 && (
              <p className="mt-1.5 text-xs text-zinc-500">
                Выбрано: {studentIds.length}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="slot-comment"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Комментарий
            </label>
            <textarea
              id="slot-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={2}
              placeholder="Необязательно"
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-xl bg-[#3166F0] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2856d4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isEditing ? 'Сохранить' : 'Добавить'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
