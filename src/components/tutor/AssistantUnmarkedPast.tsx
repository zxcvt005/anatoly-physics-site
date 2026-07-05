'use client';

import { UNMARKED_PAST_DAYS } from '@/lib/unmarked-past-bounds';
import { formatStudentShortName } from '@/lib/tutor-calculations';
import type { AssistantUnmarkedItem, Student } from '@/types/tutor';

interface AssistantUnmarkedPastProps {
  items: AssistantUnmarkedItem[];
  studentsById: Map<string, Student>;
  onMarkPresent: (item: AssistantUnmarkedItem) => void;
  onMarkAbsent: (item: AssistantUnmarkedItem) => void;
}

export function AssistantUnmarkedPast({
  items,
  studentsById,
  onMarkPresent,
  onMarkAbsent,
}: AssistantUnmarkedPastProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 md:p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white md:text-lg">
          Не отмечено
          <span className="ml-2 text-sm font-normal text-amber-400">
            ({items.length})
          </span>
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          Прошедшие занятия за последние {UNMARKED_PAST_DAYS} дней без отметки
          посещаемости
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const student = studentsById.get(item.studentId);
          if (!student) return null;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {formatStudentShortName(student.name)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {item.dateLabel} · {item.weekdayLabel}
                  </p>
                  {item.isOutsideSchedule && (
                    <span className="mt-1 inline-flex rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                      {item.lessonType === 'makeup' ? 'Отработка' : 'Разовое'}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-[#6B93FF]">
                  {item.timeLabel}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onMarkPresent(item)}
                  className="rounded-xl bg-[#3166F0] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2858d4]"
                >
                  Был
                </button>
                <button
                  type="button"
                  onClick={() => onMarkAbsent(item)}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                >
                  Не был
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
