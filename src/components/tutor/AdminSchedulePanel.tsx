'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  AddOneOffLessonButton,
  AddOneOffLessonModal,
} from '@/components/tutor/AddOneOffLessonModal';
import { TransferLessonModal } from '@/components/tutor/TransferLessonModal';
import { canTransferLesson } from '@/lib/lesson-transfer';
import { isStudentPaused } from '@/lib/student-utils';
import { AdminDeleteSlotDialog } from '@/components/tutor/AdminDeleteSlotDialog';
import { AdminSlotEditorModal } from '@/components/tutor/AdminSlotEditorModal';
import { formatLessonTimeRange, getCrmDateMs } from '@/lib/lesson-datetime';
import { getLocalWeekday } from '@/lib/lesson-utils';
import { buildSlotsByWeekday } from '@/lib/schedule-utils';
import {
  formatDateShort,
  formatStudentShortName,
  formatTime,
  formatTimeRange,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT_LABELS,
} from '@/lib/tutor-calculations';
import { useLessons } from '@/providers/LessonsProvider';
import { useScheduleSlots } from '@/providers/ScheduleSlotsProvider';
import { useStudents } from '@/providers/StudentsProvider';
import type { Lesson, Student, WeeklyScheduleSlot } from '@/types/tutor';

type ViewMode = 'today' | 'week';

export function AdminSchedulePanel() {
  const { students } = useStudents();
  const { getSlotsForWeekday, updateSlot, addSlot, deleteSlot, slots } =
    useScheduleSlots();
  const { lessons, addOneOffLesson, updateOneOffLesson, deleteOneOffLesson, getMissedLessonsForStudent, transferLesson } =
    useLessons();
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [editorOpen, setEditorOpen] = useState(false);
  const [oneOffOpen, setOneOffOpen] = useState(false);
  const [editingOneOffLesson, setEditingOneOffLesson] = useState<Lesson | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<WeeklyScheduleSlot | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<WeeklyScheduleSlot | null>(
    null,
  );
  const [defaultWeekday, setDefaultWeekday] = useState(1);

  const todayWeekday = getLocalWeekday();
  const todaySlots = useMemo(
    () => getSlotsForWeekday(todayWeekday),
    [getSlotsForWeekday, todayWeekday, slots],
  );

  const slotsByWeekday = useMemo(() => buildSlotsByWeekday(slots), [slots]);

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    for (const student of students) {
      map.set(student.id, student);
    }
    return map;
  }, [students]);

  const openCreate = (weekday: number) => {
    setEditingSlot(null);
    setDefaultWeekday(weekday);
    setEditorOpen(true);
  };

  const openEdit = (slot: WeeklyScheduleSlot) => {
    setEditingSlot(slot);
    setDefaultWeekday(slot.weekday);
    setEditorOpen(true);
  };

  const openDelete = (slot: WeeklyScheduleSlot) => {
    setDeletingSlot(slot);
    setDeleteOpen(true);
  };

  const handleSave = (data: Parameters<typeof addSlot>[0]) => {
    if (editingSlot) {
      updateSlot(editingSlot.id, data);
      return;
    }
    addSlot(data);
  };

  const formatSlotStudentLabel = (student: Student) => {
    const name = formatStudentShortName(student.name);
    return isStudentPaused(student) ? `${name} · Пауза` : name;
  };

  const getStudentNames = (slot: WeeklyScheduleSlot) =>
    slot.studentIds
      .map((id) => studentsById.get(id))
      .filter((student): student is Student => Boolean(student))
      .map(formatSlotStudentLabel);

  const todayLabel = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const deletingStudentNames = deletingSlot
    ? getStudentNames(deletingSlot)
    : [];

  const upcomingOneOffLessons = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return lessons
      .filter(
        (lesson) =>
          lesson.isOutsideSchedule &&
          lesson.status === 'scheduled' &&
          (getCrmDateMs(lesson.date) ?? 0) >= todayStart.getTime(),
      )
      .sort(
        (a, b) => (getCrmDateMs(a.date) ?? 0) - (getCrmDateMs(b.date) ?? 0),
      );
  }, [lessons]);

  return (
    <section className="mb-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white md:text-2xl">
            Расписание
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Изменения сохраняются локально и видны в ассистентке и студентке
          </p>
        </div>
        <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'today' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                Расписание на сегодня
              </h3>
              <p className="mt-0.5 text-sm capitalize text-zinc-500">
                {todayLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AddOneOffLessonButton
                onClick={() => {
                  setEditingOneOffLesson(null);
                  setOneOffOpen(true);
                }}
              />
              <button
                type="button"
                onClick={() => openCreate(todayWeekday)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#3166F0]/40 bg-[#3166F0]/10 px-3.5 py-2 text-sm font-medium text-[#6B93FF] transition hover:bg-[#3166F0]/20 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Добавить слот
              </button>
            </div>
          </div>

          {todaySlots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
              На сегодня занятий нет
            </p>
          ) : (
            <div className="space-y-3">
              {todaySlots.map((slot) => (
                <AdminSlotCard
                  key={slot.id}
                  slot={slot}
                  studentNames={getStudentNames(slot)}
                  onEdit={() => openEdit(slot)}
                  onDelete={() => openDelete(slot)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'week' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
            <AddOneOffLessonButton
              onClick={() => {
                setEditingOneOffLesson(null);
                setOneOffOpen(true);
              }}
            />
          </div>
          <AdminWeekGrid
            slotsByWeekday={slotsByWeekday}
            studentsById={studentsById}
            onEditSlot={openEdit}
            onDeleteSlot={openDelete}
            onAddSlot={openCreate}
          />
        </>
      )}

      <AdminSlotEditorModal
        open={editorOpen}
        slot={editingSlot}
        defaultWeekday={defaultWeekday}
        students={students}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />

      <AdminDeleteSlotDialog
        open={deleteOpen}
        slot={deletingSlot}
        studentNames={deletingStudentNames}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (deletingSlot) deleteSlot(deletingSlot.id);
        }}
      />

      {upcomingOneOffLessons.length > 0 && (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 md:p-5">
          <h3 className="text-base font-semibold text-white">
            Разовые занятия
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Видны в ассистентке и студентке выбранного ученика
          </p>
          <ul className="mt-4 space-y-2">
            {upcomingOneOffLessons.map((lesson) => (
              <AdminOneOffLessonRow
                key={lesson.id}
                lesson={lesson}
                student={studentsById.get(lesson.studentId)}
                onEdit={() => {
                  setEditingOneOffLesson(lesson);
                  setOneOffOpen(true);
                }}
                onTransfer={transferLesson}
              />
            ))}
          </ul>
        </div>
      )}

      <AddOneOffLessonModal
        open={oneOffOpen}
        onClose={() => {
          setOneOffOpen(false);
          setEditingOneOffLesson(null);
        }}
        students={students}
        getMissedLessons={getMissedLessonsForStudent}
        onSubmit={addOneOffLesson}
        editingLesson={editingOneOffLesson}
        onUpdate={updateOneOffLesson}
        onDelete={deleteOneOffLesson}
      />
    </section>
  );
}

function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const tabs: { id: ViewMode; label: string }[] = [
    { id: 'today', label: 'Сегодня' },
    { id: 'week', label: 'Неделя' },
  ];

  return (
    <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            viewMode === tab.id
              ? 'bg-[#3166F0] text-white shadow-[0_0_20px_rgba(49,102,240,0.3)]'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function AdminSlotCard({
  slot,
  studentNames,
  onEdit,
  onDelete,
}: {
  slot: WeeklyScheduleSlot;
  studentNames: string[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#6B93FF]">
            {formatTimeRange(slot.startTime, slot.endTime)}
          </p>
          <p className="mt-1.5 text-sm text-zinc-300">
            {studentNames.length > 0
              ? studentNames.join(', ')
              : 'Ученики не назначены'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {slot.studentIds.length}{' '}
            {slot.studentIds.length === 1 ? 'ученик' : 'учеников'}
          </p>
          {slot.comment && (
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {slot.comment}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-[#3166F0]/50 hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            Редактировать
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminWeekGrid({
  slotsByWeekday,
  studentsById,
  onEditSlot,
  onDeleteSlot,
  onAddSlot,
}: {
  slotsByWeekday: Map<number, WeeklyScheduleSlot[]>;
  studentsById: Map<string, Student>;
  onEditSlot: (slot: WeeklyScheduleSlot) => void;
  onDeleteSlot: (slot: WeeklyScheduleSlot) => void;
  onAddSlot: (weekday: number) => void;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <div className="min-w-[960px] rounded-2xl border border-zinc-800">
          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/90">
            {WEEKDAY_ORDER.map((weekday) => (
              <div
                key={weekday}
                className="border-r border-zinc-800 px-2 py-3 text-center last:border-r-0"
              >
                <p className="text-sm font-semibold text-white">
                  {WEEKDAY_SHORT_LABELS[weekday]}
                </p>
                <button
                  type="button"
                  onClick={() => onAddSlot(weekday)}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[#6B93FF] transition hover:bg-[#3166F0]/10"
                >
                  <Plus className="h-3 w-3" />
                  Слот
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {WEEKDAY_ORDER.map((weekday) => {
              const daySlots = slotsByWeekday.get(weekday) ?? [];

              return (
                <div
                  key={weekday}
                  className="min-h-[260px] space-y-2 border-r border-zinc-800 bg-zinc-950/40 p-2 last:border-r-0"
                >
                  {daySlots.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-zinc-600">
                      —
                    </p>
                  ) : (
                    daySlots.map((slot) => (
                      <AdminWeekSlotCard
                        key={slot.id}
                        slot={slot}
                        studentsById={studentsById}
                        onEdit={() => onEditSlot(slot)}
                        onDelete={() => onDeleteSlot(slot)}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4 xl:hidden">
        {WEEKDAY_ORDER.map((weekday) => {
          const daySlots = slotsByWeekday.get(weekday) ?? [];

          return (
            <div key={weekday}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  {WEEKDAY_LABELS[weekday]}
                </h3>
                <button
                  type="button"
                  onClick={() => onAddSlot(weekday)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                >
                  <Plus className="h-3 w-3" />
                  Слот
                </button>
              </div>
              {daySlots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-center text-xs text-zinc-600">
                  Нет занятий
                </p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map((slot) => (
                    <AdminWeekSlotCard
                      key={slot.id}
                      slot={slot}
                      studentsById={studentsById}
                      onEdit={() => onEditSlot(slot)}
                      onDelete={() => onDeleteSlot(slot)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function AdminOneOffLessonRow({
  lesson,
  student,
  onEdit,
  onTransfer,
}: {
  lesson: Lesson;
  student?: Student;
  onEdit: () => void;
  onTransfer: (
    lessonId: string,
    input: import('@/types/tutor').TransferLessonInput,
  ) => void;
}) {
  const [transferOpen, setTransferOpen] = useState(false);
  const typeLabel =
    lesson.lessonType === 'makeup'
      ? 'Отработка'
      : lesson.lessonType === 'transfer'
        ? 'Перенос'
        : 'Дополнительное';
  const timeLabel = formatLessonTimeRange(lesson);

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">
            {student ? formatStudentShortName(student.name) : 'Ученик'}
          </p>
          <p className="mt-0.5 text-sm text-[#6B93FF]">
            {formatDateShort(lesson.date)}
            <span className="ml-2">{timeLabel}</span>
          </p>
          {lesson.topic && (
            <p className="mt-1 text-xs text-zinc-500">{lesson.topic}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 transition hover:border-[#3166F0]/50 hover:text-white"
              aria-label="Редактировать разовое занятие"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <span
            className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${
              lesson.lessonType === 'transfer'
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-300'
            }`}
          >
            {typeLabel}
          </span>
          {canTransferLesson(lesson) && (
            <button
              type="button"
              onClick={() => setTransferOpen(true)}
              className="rounded-lg border border-sky-500/40 px-2 py-0.5 text-[10px] text-sky-300 transition hover:bg-sky-500/10"
            >
              Перенести
            </button>
          )}
        </div>
      </div>

      <TransferLessonModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSubmit={(input) => onTransfer(lesson.id, input)}
      />
    </li>
  );
}

function AdminWeekSlotCard({
  slot,
  studentsById,
  onEdit,
  onDelete,
}: {
  slot: WeeklyScheduleSlot;
  studentsById: Map<string, Student>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const names = slot.studentIds
    .map((id) => studentsById.get(id))
    .filter((student): student is Student => Boolean(student))
    .map((student) => {
      const name = formatStudentShortName(student.name);
      return isStudentPaused(student) ? `${name} · Пауза` : name;
    });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
      <p className="text-xs font-semibold text-[#6B93FF]">
        {formatTimeRange(slot.startTime, slot.endTime)}
      </p>
      <p className="mt-1 text-xs leading-snug text-zinc-300">
        {names.join(', ') || '—'}
      </p>
      {slot.comment && (
        <p className="mt-1 line-clamp-2 text-[10px] text-zinc-500">
          {slot.comment}
        </p>
      )}
      <div className="mt-2 flex gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-white"
        >
          Изменить
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-red-500/30 px-2 py-0.5 text-[10px] text-red-400"
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
