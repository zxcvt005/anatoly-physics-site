'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  AddOneOffLessonButton,
  AddOneOffLessonModal,
} from '@/components/tutor/AddOneOffLessonModal';
import { AssistantMarkedSummary } from '@/components/tutor/AssistantMarkedSummary';
import { AssistantMarkingForm } from '@/components/tutor/AssistantMarkingForm';
import { AssistantIntensivesTable } from '@/components/tutor/AssistantIntensivesTable';
import { AssistantTodaySchedule } from '@/components/tutor/AssistantTodaySchedule';
import { CollapsiblePanel } from '@/components/tutor/CollapsiblePanel';
import {
  buildHistoryFromLessons,
  buildTodayMarkingItems,
  buildTodayScheduleCards,
  completedTodayToMarkedEntries,
  matchCompletedEntryToTodayItem,
  todayItemToMarkedEntry,
} from '@/lib/assistant-marking';
import type { TodayScheduleSlotCard } from '@/lib/assistant-marking';
import { formatLessonTimeRange } from '@/lib/lesson-datetime';
import { resolveMaterializedLessonId } from '@/lib/lesson-marking';
import { getLocalWeekday, isLessonOnLocalDate } from '@/lib/lesson-utils';
import { slotMatchesWeekday } from '@/lib/schedule-utils';
import {
  formatDateShort,
  formatStudentShortName,
  formatTime,
  formatTimeRange,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT_LABELS,
} from '@/lib/tutor-calculations';
import { isStudentPaused } from '@/lib/student-utils';
import { useLessons } from '@/providers/LessonsProvider';
import { useScheduleSlots } from '@/providers/ScheduleSlotsProvider';
import { useStudents } from '@/providers/StudentsProvider';
import type {
  AssistantMarkedEntry,
  AssistantMarkingData,
  AssistantTodayItem,
  Lesson,
  Student,
  WeeklyScheduleSlot,
} from '@/types/tutor';

type ViewMode = 'today' | 'week' | 'history' | 'intensives';


function isInCurrentWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return date >= monday && date <= sunday;
}

function getOneOffLessonsForWeekday(
  lessons: Lesson[],
  weekday: number,
): Lesson[] {
  return lessons
    .filter(
      (lesson) =>
        lesson.isOutsideSchedule &&
        lesson.status === 'scheduled' &&
        new Date(lesson.date).getDay() === weekday &&
        isInCurrentWeek(lesson.date),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function AssistantSchedule() {
  const { students } = useStudents();
  const { slots } = useScheduleSlots();
  const {
    lessons,
    addOneOffLesson,
    applyLessonMarking,
    markTodayLesson,
    getMissedLessonsForStudent,
  } = useLessons();
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [modalOpen, setModalOpen] = useState(false);
  const [todaySessionMarkings, setTodaySessionMarkings] = useState<
    Record<string, AssistantMarkedEntry>
  >({});

  const studentsById = useMemo(() => {
    const map = new Map<string, Student>();
    for (const student of students) {
      map.set(student.id, student);
    }
    return map;
  }, [students]);

  const pausedStudentIds = useMemo(
    () =>
      new Set(
        students.filter(isStudentPaused).map((student) => student.id),
      ),
    [students],
  );

  const todayWeekday = getLocalWeekday();
  const todayItems = useMemo(
    () =>
      buildTodayMarkingItems(
        slots,
        todayWeekday,
        lessons,
        pausedStudentIds,
      ),
    [slots, todayWeekday, lessons, pausedStudentIds],
  );

  useEffect(() => {
    const fromLessons = completedTodayToMarkedEntries(lessons);

    setTodaySessionMarkings((current) => {
      let changed = false;
      const next = { ...current };

      for (const item of todayItems) {
        if (next[item.id]) continue;

        const entry = fromLessons.find((lessonEntry) =>
          matchCompletedEntryToTodayItem(
            lessonEntry,
            item,
            lessons,
            slots,
          ),
        );
        if (!entry) continue;

        next[item.id] = {
          ...entry,
          id: `today-${item.id}`,
          lessonId: entry.lessonId,
          studentId: item.studentId,
          timeLabel: item.timeLabel,
        };
        changed = true;
      }

      return changed ? next : current;
    });
  }, [lessons, todayItems, slots]);

  const markedItemIds = useMemo(
    () => new Set(Object.keys(todaySessionMarkings)),
    [todaySessionMarkings],
  );

  const markedTodayList = useMemo(
    () =>
      Object.values(todaySessionMarkings).sort((a, b) =>
        a.timeLabel.localeCompare(b.timeLabel),
      ),
    [todaySessionMarkings],
  );

  const pendingToday = useMemo(
    () => todayItems.filter((item) => !todaySessionMarkings[item.id]),
    [todayItems, todaySessionMarkings],
  );

  const todayScheduleCards = useMemo(
    () =>
      buildTodayScheduleCards(
        slots,
        todayWeekday,
        todayItems,
        markedItemIds,
      ),
    [slots, todayWeekday, todayItems, markedItemIds],
  );

  const historyEntries = useMemo(
    () =>
      buildHistoryFromLessons(lessons).filter(
        (entry) => !isLessonOnLocalDate(entry.markedAt),
      ),
    [lessons],
  );

  const slotsByWeekday = useMemo(() => {
    const map = new Map<number, WeeklyScheduleSlot[]>();

    for (const weekday of WEEKDAY_ORDER) {
      map.set(
        weekday,
        slots
          .filter((slot) => slotMatchesWeekday(slot, weekday))
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      );
    }

    return map;
  }, [slots]);

  const oneOffByWeekday = useMemo(() => {
    const map = new Map<number, Lesson[]>();
    for (const weekday of WEEKDAY_ORDER) {
      map.set(weekday, getOneOffLessonsForWeekday(lessons, weekday));
    }
    return map;
  }, [lessons]);

  const handleMarkToday = (
    item: AssistantTodayItem,
    marking: AssistantMarkingData,
  ) => {
    const lessonId = markTodayLesson(item, marking);

    setTodaySessionMarkings((current) => ({
      ...current,
      [item.id]: {
        ...todayItemToMarkedEntry(item, marking),
        lessonId,
      },
    }));
  };

  const handleUpdateTodayMarking = (
    itemId: string,
    marking: AssistantMarkingData,
  ) => {
    const existing = todaySessionMarkings[itemId];
    if (!existing) return;

    const item = todayItems.find((entry) => entry.id === itemId);
    const lessonId = resolveMaterializedLessonId(
      existing.lessonId ?? item?.lessonId ?? '',
      existing.studentId,
      existing.timeLabel,
      lessons,
    );

    if (!lessonId) return;

    setTodaySessionMarkings((current) => {
      const currentEntry = current[itemId];
      if (!currentEntry) return current;

      return {
        ...current,
        [itemId]: {
          ...(item
            ? todayItemToMarkedEntry(item, marking)
            : {
                ...currentEntry,
                marking,
              }),
          lessonId,
          markedAt: currentEntry.markedAt,
        },
      };
    });

    applyLessonMarking(lessonId, marking);
  };

  const handleUpdateHistory = (
    entryId: string,
    marking: AssistantMarkingData,
  ) => {
    const entry = buildHistoryFromLessons(lessons).find((e) => e.id === entryId);
    if (entry?.lessonId) {
      applyLessonMarking(entry.lessonId, marking);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        <div className="flex flex-wrap items-center gap-3">
          <AddOneOffLessonButton onClick={() => setModalOpen(true)} />
          <p className="text-sm text-zinc-500">
            {viewMode === 'today' &&
              `${WEEKDAY_LABELS[todayWeekday]}, ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`}
            {viewMode === 'week' && 'Расписание на неделю'}
            {viewMode === 'history' && 'Ранее отмеченные занятия'}
            {viewMode === 'intensives' && 'Прогресс учеников по интенсивам'}
          </p>
        </div>
      </div>

      {viewMode === 'today' && (
        <TodayDispatchView
          scheduleCards={todayScheduleCards}
          todayItems={todayItems}
          markedItemIds={markedItemIds}
          pending={pendingToday}
          marked={markedTodayList}
          studentsById={studentsById}
          onMark={handleMarkToday}
          onUpdateMarking={handleUpdateTodayMarking}
        />
      )}

      {viewMode === 'week' && (
        <WeekView
          slotsByWeekday={slotsByWeekday}
          oneOffByWeekday={oneOffByWeekday}
          studentsById={studentsById}
        />
      )}

      {viewMode === 'history' && (
        <HistoryView
          entries={historyEntries}
          studentsById={studentsById}
          onUpdate={handleUpdateHistory}
        />
      )}

      {viewMode === 'intensives' && (
        <AssistantIntensivesTable students={students} />
      )}

      <AddOneOffLessonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        students={students}
        getMissedLessons={getMissedLessonsForStudent}
        onSubmit={addOneOffLesson}
      />
    </div>
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
    { id: 'history', label: 'История' },
    { id: 'intensives', label: 'Интенсивы' },
  ];

  return (
    <div className="inline-flex flex-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-1">
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

function getTodayItemIdFromEntry(entry: AssistantMarkedEntry): string {
  return entry.id.startsWith('today-') ? entry.id.slice(6) : entry.id;
}

function TodayDispatchView({
  scheduleCards,
  todayItems,
  markedItemIds,
  pending,
  marked,
  studentsById,
  onMark,
  onUpdateMarking,
}: {
  scheduleCards: TodayScheduleSlotCard[];
  todayItems: AssistantTodayItem[];
  markedItemIds: Set<string>;
  pending: AssistantTodayItem[];
  marked: AssistantMarkedEntry[];
  studentsById: Map<string, Student>;
  onMark: (item: AssistantTodayItem, marking: AssistantMarkingData) => void;
  onUpdateMarking: (itemId: string, marking: AssistantMarkingData) => void;
}) {
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const [highlightedItemIds, setHighlightedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [editingMarkedId, setEditingMarkedId] = useState<string | null>(null);

  const handleFocusItems = useCallback((itemIds: string[]) => {
    if (itemIds.length === 0) return;

    setHighlightedItemIds(new Set(itemIds));

    const firstElement = itemRefs.current.get(itemIds[0]);
    firstElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.setTimeout(() => {
      setHighlightedItemIds(new Set());
    }, 2500);
  }, []);

  const hasDispatchItems = pending.length > 0 || marked.length > 0;

  return (
    <div className="space-y-6">
      <AssistantTodaySchedule
        cards={scheduleCards}
        todayItems={todayItems}
        markedItemIds={markedItemIds}
        studentsById={studentsById}
        onFocusItems={handleFocusItems}
        highlightedItemIds={highlightedItemIds}
      />

      {!hasDispatchItems && scheduleCards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center text-zinc-500">
          На сегодня занятий в расписании нет
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <SectionHeading
          title="Требует отметки"
          count={pending.length}
          accent
        />
        {pending.length === 0 ? (
          <EmptyColumn text="Все ученики отмечены" />
        ) : (
          <div className="space-y-3">
            {pending.map((item) => {
              const student = studentsById.get(item.studentId);
              if (!student) return null;

              const isHighlighted = highlightedItemIds.has(item.id);

              return (
                <div
                  key={item.id}
                  ref={(element) => {
                    if (element) {
                      itemRefs.current.set(item.id, element);
                    } else {
                      itemRefs.current.delete(item.id);
                    }
                  }}
                  className={`rounded-2xl border bg-zinc-950 p-4 transition-shadow ${
                    isHighlighted
                      ? 'border-[#3166F0]/60 shadow-[0_0_0_1px_rgba(49,102,240,0.4)]'
                      : 'border-zinc-800'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {formatStudentShortName(student.name)}
                      </p>
                      {item.isOutsideSchedule && (
                        <LessonTypeBadge lessonType={item.lessonType} />
                      )}
                    </div>
                    <span className="text-xs font-medium text-[#6B93FF]">
                      {item.timeLabel}
                    </span>
                  </div>
                  <AssistantMarkingForm
                    onSave={(marking) => onMark(item, marking)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Отмечено" count={marked.length} />
        {marked.length === 0 ? (
          <EmptyColumn text="Пока никого не отметили" />
        ) : (
          <div className="space-y-2">
            {marked.map((entry) => {
              const student = studentsById.get(entry.studentId);
              if (!student) return null;

              const itemId = getTodayItemIdFromEntry(entry);
              const isEditing = editingMarkedId === itemId;

              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl border bg-zinc-950 transition-colors ${
                    isEditing ? 'border-[#3166F0]/40' : 'border-zinc-800'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <AssistantMarkedSummary entry={entry} student={student} />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingMarkedId(isEditing ? null : itemId)
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-[#3166F0]/50 hover:text-white"
                    >
                      {isEditing ? 'Свернуть' : 'Изменить'}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-300 ${
                          isEditing ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <CollapsiblePanel open={isEditing}>
                    <div className="border-t border-zinc-800 px-3 pb-3 pt-2">
                      <AssistantMarkingForm
                        key={`edit-${itemId}-${isEditing}`}
                        initialValues={entry.marking}
                        submitLabel="Сохранить изменения"
                        onSave={(marking) => {
                          onUpdateMarking(itemId, marking);
                          setEditingMarkedId(null);
                        }}
                      />
                    </div>
                  </CollapsiblePanel>
                </div>
              );
            })}
          </div>
        )}
      </section>
        </div>
      )}
    </div>
  );
}

function LessonTypeBadge({
  lessonType,
}: {
  lessonType?: Lesson['lessonType'];
}) {
  if (lessonType === 'makeup') {
    return (
      <span className="mt-1 inline-flex rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
        Отработка
      </span>
    );
  }
  if (lessonType === 'extra') {
    return (
      <span className="mt-1 inline-flex rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">
        Дополнительное
      </span>
    );
  }
  return null;
}

function HistoryView({
  entries,
  studentsById,
  onUpdate,
}: {
  entries: AssistantMarkedEntry[];
  studentsById: Map<string, Student>;
  onUpdate: (entryId: string, marking: AssistantMarkingData) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center text-zinc-500">
        История пока пуста
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const student = studentsById.get(entry.studentId);
        if (!student) return null;

        const isEditing = editingId === entry.id;

        return (
          <div
            key={entry.id}
            className={`rounded-2xl border bg-zinc-950 transition-colors ${
              isEditing ? 'border-[#3166F0]/40' : 'border-zinc-800'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  {formatStudentShortName(student.name)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {entry.dateLabel} · {entry.timeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingId(isEditing ? null : entry.id)
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-[#3166F0]/50 hover:text-white"
              >
                {isEditing ? 'Свернуть' : 'Редактировать'}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    isEditing ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {!isEditing ? (
              <div className="border-t border-zinc-800 px-4 pb-4 pt-2">
                <AssistantMarkedSummary entry={entry} student={student} />
              </div>
            ) : (
              <CollapsiblePanel open={isEditing}>
                <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
                  <AssistantMarkingForm
                    initialValues={entry.marking}
                    submitLabel="Сохранить изменения"
                    onSave={(marking) => {
                      onUpdate(entry.id, marking);
                      setEditingId(null);
                    }}
                  />
                </div>
              </CollapsiblePanel>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionHeading({
  title,
  count,
  accent,
}: {
  title: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <h3
      className={`mb-3 text-base font-semibold md:text-lg ${
        accent ? 'text-white' : 'text-zinc-300'
      }`}
    >
      {title}
      <span
        className={`ml-2 text-sm font-normal ${
          accent && count > 0 ? 'text-amber-400' : 'text-zinc-500'
        }`}
      >
        ({count})
      </span>
    </h3>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
      {text}
    </p>
  );
}

function WeekView({
  slotsByWeekday,
  oneOffByWeekday,
  studentsById,
}: {
  slotsByWeekday: Map<number, WeeklyScheduleSlot[]>;
  oneOffByWeekday: Map<number, Lesson[]>;
  studentsById: Map<string, Student>;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <div className="min-w-[960px] rounded-2xl border border-zinc-800">
          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/90">
            {WEEKDAY_ORDER.map((weekday) => (
              <div
                key={weekday}
                className="border-r border-zinc-800 px-3 py-3 text-center text-sm font-semibold text-white last:border-r-0"
              >
                {WEEKDAY_SHORT_LABELS[weekday]}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {WEEKDAY_ORDER.map((weekday) => {
              const daySlots = slotsByWeekday.get(weekday) ?? [];
              const oneOff = oneOffByWeekday.get(weekday) ?? [];

              return (
                <div
                  key={weekday}
                  className="min-h-[280px] space-y-2 border-r border-zinc-800 bg-zinc-950/40 p-2 last:border-r-0"
                >
                  {daySlots.length === 0 && oneOff.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-zinc-600">
                      —
                    </p>
                  ) : (
                    <>
                      {daySlots.map((slot) => (
                        <WeekSlotCard
                          key={slot.id}
                          slot={slot}
                          studentsById={studentsById}
                        />
                      ))}
                      {oneOff.map((lesson) => (
                        <OneOffWeekCard
                          key={lesson.id}
                          lesson={lesson}
                          studentsById={studentsById}
                        />
                      ))}
                    </>
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
          const oneOff = oneOffByWeekday.get(weekday) ?? [];

          return (
            <div key={weekday}>
              <h3 className="mb-2 text-sm font-semibold text-white">
                {WEEKDAY_LABELS[weekday]}
              </h3>
              {daySlots.length === 0 && oneOff.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-center text-xs text-zinc-600">
                  Нет занятий
                </p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map((slot) => (
                    <WeekSlotCard
                      key={slot.id}
                      slot={slot}
                      studentsById={studentsById}
                    />
                  ))}
                  {oneOff.map((lesson) => (
                    <OneOffWeekCard
                      key={lesson.id}
                      lesson={lesson}
                      studentsById={studentsById}
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

function WeekSlotCard({
  slot,
  studentsById,
}: {
  slot: WeeklyScheduleSlot;
  studentsById: Map<string, Student>;
}) {
  const studentNames = slot.studentIds
    .map((id) => studentsById.get(id))
    .filter((student): student is Student => Boolean(student))
    .map((student) => formatStudentShortName(student.name));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
      <p className="text-xs font-semibold text-[#6B93FF]">
        {formatTimeRange(slot.startTime, slot.endTime)}
      </p>
      <p className="mt-1 text-xs leading-snug text-zinc-300">
        {studentNames.join(', ')}
      </p>
      {slot.studentIds.length > 1 && (
        <p className="mt-1 text-[10px] text-zinc-500">
          {slot.studentIds.length} уч.
        </p>
      )}
    </div>
  );
}

function OneOffWeekCard({
  lesson,
  studentsById,
}: {
  lesson: Lesson;
  studentsById: Map<string, Student>;
}) {
  const student = studentsById.get(lesson.studentId);

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-2.5 py-2">
      <p className="text-xs font-semibold text-violet-300">
        {formatLessonTimeRange(lesson)}
        <span className="ml-1.5 font-normal text-violet-400/80">
          {formatDateShort(lesson.date)}
        </span>
      </p>
      <p className="mt-1 text-xs leading-snug text-zinc-300">
        {student ? formatStudentShortName(student.name) : '—'}
      </p>
      <LessonTypeBadge lessonType={lesson.lessonType} />
    </div>
  );
}
