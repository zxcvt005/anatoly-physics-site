'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CollapsiblePanel } from '@/components/tutor/CollapsiblePanel';
import { formatLessonTimeRange } from '@/lib/lesson-datetime';
import {
  calendarStatusLabels,
  dayOfWeekNames,
  formatLessonDate,
  formatMonthYear,
  getCalendarLessonStatus,
  getFutureLessonPaymentStatus,
  getLessonDateKey,
} from '@/lib/tutor-calculations';
import type {
  CalendarLessonStatus,
  LessonQueueCoverage,
} from '@/lib/tutor-calculations';
import type { Lesson, LessonType, ScheduleSlot } from '@/types/tutor';

interface StudentLessonCalendarProps {
  lessons: Lesson[];
  scheduleSlots: ScheduleSlot[];
  coverageByLessonId: Map<string, LessonQueueCoverage>;
  isPaused?: boolean;
  compact?: boolean;
  className?: string;
}

const WEEKDAY_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const statusStyles: Record<
  CalendarLessonStatus,
  { cell: string; dot: string }
> = {
  completed: {
    cell: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40',
    dot: 'bg-emerald-400',
  },
  covered: {
    cell: 'bg-[#3166F0]/15 text-[#6B93FF] ring-1 ring-[#3166F0]/45',
    dot: 'bg-[#3166F0]',
  },
  pending: {
    cell: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40',
    dot: 'bg-amber-400',
  },
  required: {
    cell: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/40',
    dot: 'bg-red-400',
  },
  outside_schedule: {
    cell: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/40',
    dot: 'bg-violet-400',
  },
  transferred: {
    cell: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40',
    dot: 'bg-sky-400',
  },
  transfer: {
    cell: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40',
    dot: 'bg-cyan-400',
  },
};

const legendItems: CalendarLessonStatus[] = [
  'completed',
  'covered',
  'pending',
  'required',
];

const lessonTypeLabels: Record<LessonType, string> = {
  regular: 'Обычное',
  makeup: 'Отработка',
  extra: 'Дополнительное',
  transfer: 'Перенос',
};

const futurePaymentLabels = {
  covered: 'Покрыто оплатой',
  pending: 'Ожидает подтверждения оплаты',
  required: 'Требуется оплата',
} as const;

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  return cells;
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function groupLessonsByDate(lessons: Lesson[]): Map<string, Lesson[]> {
  const map = new Map<string, Lesson[]>();

  for (const lesson of lessons) {
    const key = getLessonDateKey(lesson.date);
    const existing = map.get(key) ?? [];
    existing.push(lesson);
    map.set(key, existing);
  }

  for (const [key, dayLessons] of map) {
    map.set(
      key,
      dayLessons.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    );
  }

  return map;
}

function getDayCellClass(
  dayLessons: Lesson[],
  coverageByLessonId: Map<string, LessonQueueCoverage>,
): string {
  if (dayLessons.length === 0) return '';

  const statuses = dayLessons.map((lesson) =>
    getCalendarLessonStatus(lesson, coverageByLessonId.get(lesson.id)),
  );
  const uniqueStatuses = new Set(statuses);

  if (uniqueStatuses.size === 1) {
    return statusStyles[statuses[0]].cell;
  }

  return 'bg-zinc-800/60 text-zinc-200 ring-1 ring-zinc-600';
}

export function StudentLessonCalendar({
  lessons,
  scheduleSlots,
  coverageByLessonId,
  isPaused = false,
  compact = false,
  className = '',
}: StudentLessonCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pinnedDateKey, setPinnedDateKey] = useState<string | null>(null);
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const lessonsByDate = useMemo(
    () => groupLessonsByDate(lessons),
    [lessons],
  );

  const calendarCells = useMemo(
    () => buildCalendarCells(year, month),
    [year, month],
  );

  const activeDateKey = pinnedDateKey ?? hoveredDateKey;
  const activeLessons = activeDateKey
    ? (lessonsByDate.get(activeDateKey) ?? [])
    : [];
  const [displayLessons, setDisplayLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    const dayLessons = activeDateKey
      ? (lessonsByDate.get(activeDateKey) ?? [])
      : [];

    if (dayLessons.length > 0) {
      setDisplayLessons(dayLessons);
      return;
    }

    const timer = window.setTimeout(() => setDisplayLessons([]), 300);
    return () => window.clearTimeout(timer);
  }, [activeDateKey, lessonsByDate]);

  const isTooltipOpen = activeLessons.length > 0;

  const handleDayClick = useCallback((dateKey: string, hasLesson: boolean) => {
    if (!hasLesson) {
      setPinnedDateKey(null);
      return;
    }

    setPinnedDateKey((current) => (current === dateKey ? null : dateKey));
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setPinnedDateKey(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const todayKey = toDateKey(year, month, today.getDate());
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  const legendTextClass = compact
    ? 'text-xs leading-snug sm:text-sm xl:text-sm'
    : 'text-xs xl:text-sm';

  const legendDotClass = compact
    ? 'h-2 w-2 xl:h-2.5 xl:w-2.5'
    : 'h-2.5 w-2.5';

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 ${
        compact ? 'px-3.5 py-3.5' : 'px-5 py-5'
      } ${className}`}
    >
      <div
        className={
          compact
            ? 'flex flex-wrap items-start justify-between gap-x-4 gap-y-2'
            : undefined
        }
      >
        <div>
          <h2
            className={`font-semibold text-white ${
              compact ? 'text-base' : 'text-lg md:text-xl'
            }`}
          >
            Расписание занятий
          </h2>
          <p
            className={`text-zinc-500 ${compact ? 'mt-0.5 text-xs xl:text-sm' : 'mt-1 text-sm'}`}
          >
            Время указано по Москве
          </p>
        </div>

        {compact && scheduleSlots.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400 xl:text-sm">
            {scheduleSlots.map((slot) => (
              <li key={slot.id}>
                <span className="text-zinc-300">
                  {dayOfWeekNames[slot.dayOfWeek]}
                </span>
                <span className="text-zinc-600"> · </span>
                <span className="font-medium text-[#6B93FF]">{slot.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!compact && scheduleSlots.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {scheduleSlots.map((slot) => (
            <li key={slot.id} className="text-sm text-zinc-300">
              <span className="text-white">
                {dayOfWeekNames[slot.dayOfWeek]}
              </span>
              <span className="text-zinc-500"> — </span>
              <span className="font-medium text-[#6B93FF]">{slot.time}</span>
            </li>
          ))}
        </ul>
      )}

      {isPaused && (
        <p className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-400">
          Пауза в занятиях — будущее расписание скрыто
        </p>
      )}

      {!isPaused && !compact && scheduleSlots.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          Постоянное расписание пока не задано
        </p>
      )}

      <div
        className={`flex flex-col border-t border-zinc-800 ${
          compact ? 'mt-3 pt-3' : 'mt-6 pt-5'
        }`}
      >
        <p
          className={`text-center font-medium capitalize text-zinc-300 ${
            compact ? 'mb-2 text-xs' : 'mb-4 text-sm'
          }`}
        >
          {formatMonthYear(today)}
        </p>

        <div
          className={`grid grid-cols-7 text-center text-zinc-500 ${
            compact ? 'gap-0.5 text-[10px]' : 'gap-1 text-xs sm:gap-1.5'
          }`}
        >
          {WEEKDAY_HEADERS.map((day) => (
            <div key={day} className={`font-medium ${compact ? 'py-0.5' : 'py-1'}`}>
              {day}
            </div>
          ))}
        </div>

        <div
          className={`grid grid-cols-7 ${
            compact ? 'mt-0.5 gap-0.5' : 'mt-1 gap-1 sm:gap-1.5'
          }`}
        >
          {calendarCells.map((day, index) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${index}`}
                  className={compact ? 'h-7' : 'aspect-square'}
                />
              );
            }

            const dateKey = toDateKey(year, month, day);
            const dayLessons = lessonsByDate.get(dateKey) ?? [];
            const hasLesson = dayLessons.length > 0;
            const cellClass = getDayCellClass(dayLessons, coverageByLessonId);
            const isToday = isCurrentMonth && dateKey === todayKey;
            const isActive = activeDateKey === dateKey;

            return (
              <button
                key={dateKey}
                type="button"
                disabled={!hasLesson}
                onClick={() => handleDayClick(dateKey, hasLesson)}
                onMouseEnter={() => {
                  if (hasLesson) setHoveredDateKey(dateKey);
                }}
                onMouseLeave={() => setHoveredDateKey(null)}
                className={`relative flex flex-col items-center justify-center rounded-md transition ${
                  compact ? 'mx-auto h-7 w-7 text-[11px]' : 'aspect-square rounded-lg text-sm'
                } ${
                  hasLesson
                    ? `${cellClass} cursor-pointer hover:brightness-110`
                    : 'text-zinc-600'
                } ${isToday && !hasLesson ? 'ring-1 ring-zinc-600' : ''} ${
                  isActive ? 'brightness-125' : ''
                }`}
                aria-label={
                  hasLesson
                    ? `${dayLessons.length} ${dayLessons.length === 1 ? 'занятие' : 'занятия'} ${day} числа`
                    : `${day} число без занятия`
                }
              >
                <span className="font-medium leading-none">{day}</span>
                {hasLesson && (
                  <DayLessonIndicators
                    lessons={dayLessons}
                    coverageByLessonId={coverageByLessonId}
                    compact={compact}
                  />
                )}
              </button>
            );
          })}
        </div>

        <CollapsiblePanel open={isTooltipOpen}>
          {displayLessons.length > 0 && (
            <DayLessonsPanel
              lessons={displayLessons}
              coverageByLessonId={coverageByLessonId}
              compact={compact}
            />
          )}
        </CollapsiblePanel>

        <div
          className={`mt-2 flex flex-wrap border-t border-zinc-800 ${
            compact ? 'gap-x-3 gap-y-1.5 pt-2' : 'mt-5 gap-x-4 gap-y-2 pt-4'
          }`}
        >
          {legendItems.map((status) => (
            <div
              key={status}
              className={`flex items-center gap-1.5 text-zinc-400 ${legendTextClass}`}
            >
              <span
                className={`shrink-0 rounded-full ${statusStyles[status].dot} ${legendDotClass}`}
                aria-hidden
              />
              <span>{calendarStatusLabels[status]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayLessonIndicators({
  lessons,
  coverageByLessonId,
  compact,
}: {
  lessons: Lesson[];
  coverageByLessonId: Map<string, LessonQueueCoverage>;
  compact: boolean;
}) {
  if (lessons.length === 1) {
    const status = getCalendarLessonStatus(
      lessons[0],
      coverageByLessonId.get(lessons[0].id),
    );
    return (
      <span
        className={`absolute rounded-full ${statusStyles[status].dot} ${
          compact ? 'bottom-0.5 h-0.5 w-0.5' : 'bottom-1 h-1 w-1'
        }`}
        aria-hidden
      />
    );
  }

  const maxDots = compact ? 3 : 4;
  const visible = lessons.slice(0, maxDots);

  return (
    <div
      className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-px ${
        compact ? 'bottom-0' : 'bottom-0.5'
      }`}
    >
      {visible.map((lesson) => {
        const status = getCalendarLessonStatus(
          lesson,
          coverageByLessonId.get(lesson.id),
        );
        return (
          <span
            key={lesson.id}
            className={`rounded-full ${statusStyles[status].dot} ${
              compact ? 'h-0.5 w-0.5' : 'h-1 w-1'
            }`}
            aria-hidden
          />
        );
      })}
      {lessons.length > maxDots && (
        <span
          className={`font-medium text-zinc-400 ${
            compact ? 'ml-px text-[7px]' : 'ml-0.5 text-[8px]'
          }`}
        >
          +{lessons.length - maxDots}
        </span>
      )}
    </div>
  );
}

function DayLessonsPanel({
  lessons,
  coverageByLessonId,
  compact,
}: {
  lessons: Lesson[];
  coverageByLessonId: Map<string, LessonQueueCoverage>;
  compact: boolean;
}) {
  const dateLabel =
    lessons.length > 0 ? formatLessonDate(lessons[0].date) : '';

  return (
    <div
      className={`rounded-lg border border-zinc-700 bg-zinc-900/90 ${
        compact ? 'mt-2 px-3 py-2' : 'mt-4 px-4 py-3'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`font-medium text-white ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {dateLabel}
        </p>
        {lessons.length > 1 && (
          <span
            className={`rounded-full border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-zinc-400 ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}
          >
            {lessons.length} занятия
          </span>
        )}
      </div>

      <ul className={`space-y-2 ${compact ? 'mt-2' : 'mt-3'}`}>
        {lessons.map((lesson) => (
          <DayLessonRow
            key={lesson.id}
            lesson={lesson}
            coverage={coverageByLessonId.get(lesson.id)}
            compact={compact}
          />
        ))}
      </ul>
    </div>
  );
}

function DayLessonRow({
  lesson,
  coverage,
  compact,
}: {
  lesson: Lesson;
  coverage?: LessonQueueCoverage;
  compact: boolean;
}) {
  const calendarStatus = getCalendarLessonStatus(lesson, coverage);
  const paymentLabel =
    lesson.status === 'completed'
      ? calendarStatusLabels.completed
      : futurePaymentLabels[getFutureLessonPaymentStatus(lesson, coverage)];

  const timeLabel = formatLessonTimeRange(lesson);

  return (
    <li
      className={`rounded-lg border border-zinc-800 bg-zinc-950/80 ${
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className={`font-medium text-[#6B93FF] ${compact ? 'text-xs' : 'text-sm'}`}>
          {timeLabel}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
            compact ? 'text-[10px]' : 'text-xs'
          } ${statusBadgeClass(calendarStatus)}`}
        >
          <span
            className={`rounded-full ${statusStyles[calendarStatus].dot} h-1.5 w-1.5`}
            aria-hidden
          />
          {paymentLabel}
        </span>
      </div>

      <div
        className={`mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-zinc-500 ${
          compact ? 'text-[10px]' : 'text-xs'
        }`}
      >
        <span className="text-zinc-400">
          {lessonTypeLabels[lesson.lessonType]}
        </span>
        <span className="text-zinc-700">·</span>
        <span>
          {lesson.status === 'completed' ? 'Проведено' : 'Запланировано'}
        </span>
      </div>

      {lesson.topic && (
        <p
          className={`text-zinc-400 ${compact ? 'mt-1 text-[10px]' : 'mt-1.5 text-xs'}`}
        >
          {lesson.topic}
        </p>
      )}
    </li>
  );
}

function statusBadgeClass(status: CalendarLessonStatus): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/30 text-emerald-300';
    case 'covered':
      return 'border-[#3166F0]/30 text-[#6B93FF]';
    case 'pending':
      return 'border-amber-500/30 text-amber-300';
    case 'required':
      return 'border-red-500/30 text-red-300';
    default:
      return 'border-violet-500/30 text-violet-300';
  }
}
