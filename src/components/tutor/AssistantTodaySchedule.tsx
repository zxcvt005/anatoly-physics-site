'use client';

import { useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CollapsiblePanel } from '@/components/tutor/CollapsiblePanel';
import type { TodayScheduleSlotCard } from '@/lib/assistant-marking';
import { formatStudentShortName } from '@/lib/tutor-calculations';
import type { AssistantTodayItem, Student } from '@/types/tutor';

type SlotVisualState = 'neutral' | 'partial' | 'complete' | 'overdue' | 'overdue-empty';

interface AssistantTodayScheduleProps {
  cards: TodayScheduleSlotCard[];
  todayItems: AssistantTodayItem[];
  markedItemIds: Set<string>;
  studentsById: Map<string, Student>;
  onFocusItems: (itemIds: string[]) => void;
  highlightedItemIds: Set<string>;
}

function getSlotVisualState(card: TodayScheduleSlotCard): SlotVisualState {
  if (card.totalCount > 0 && card.markedCount === card.totalCount) {
    return 'complete';
  }
  if (card.markedCount > 0) {
    return 'partial';
  }
  if (card.isPast && card.markedCount === 0) {
    return 'overdue-empty';
  }
  if (card.isPast && card.markedCount < card.totalCount) {
    return 'overdue';
  }
  return 'neutral';
}

const slotStateStyles: Record<
  SlotVisualState,
  { card: string; badge: string; progress: string }
> = {
  neutral: {
    card: 'border-zinc-800 bg-zinc-950 hover:border-zinc-700',
    badge: 'bg-zinc-800 text-zinc-400',
    progress: 'bg-zinc-700',
  },
  partial: {
    card: 'border-[#3166F0]/45 bg-[#3166F0]/10 hover:border-[#3166F0]/60',
    badge: 'bg-[#3166F0]/20 text-[#6B93FF]',
    progress: 'bg-[#3166F0]',
  },
  complete: {
    card: 'border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/55',
    badge: 'bg-emerald-500/20 text-emerald-300',
    progress: 'bg-emerald-500',
  },
  overdue: {
    card: 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/55',
    badge: 'bg-amber-500/15 text-amber-300',
    progress: 'bg-amber-500',
  },
  'overdue-empty': {
    card: 'border-red-500/35 bg-red-500/5 hover:border-red-500/50',
    badge: 'bg-red-500/15 text-red-300',
    progress: 'bg-red-500',
  },
};

function getMarkingStatusLabel(card: TodayScheduleSlotCard): string {
  if (card.totalCount === 0) return 'Нет учеников';
  if (card.markedCount === card.totalCount) return 'Все отмечены';
  return `${card.markedCount} из ${card.totalCount} отмечено`;
}

export function AssistantTodaySchedule({
  cards,
  todayItems,
  markedItemIds,
  studentsById,
  onFocusItems,
  highlightedItemIds,
}: AssistantTodayScheduleProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const todayLabel = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleCardClick = useCallback(
    (card: TodayScheduleSlotCard) => {
      setExpandedCardId((current) => (current === card.id ? null : card.id));
      const pendingItemIds = card.itemIds.filter(
        (itemId) => !markedItemIds.has(itemId),
      );
      if (pendingItemIds.length > 0) {
        onFocusItems(pendingItemIds);
      }
    },
    [markedItemIds, onFocusItems],
  );

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 md:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white md:text-lg">
          Расписание на сегодня
        </h2>
        <p className="mt-0.5 text-sm capitalize text-zinc-500">{todayLabel}</p>
      </div>

      {cards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
          На сегодня занятий нет
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cards.map((card) => (
            <TodaySlotCard
              key={card.id}
              card={card}
              studentsById={studentsById}
              todayItems={todayItems}
              markedItemIds={markedItemIds}
              isExpanded={expandedCardId === card.id}
              highlightedItemIds={highlightedItemIds}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TodaySlotCard({
  card,
  studentsById,
  todayItems,
  markedItemIds,
  isExpanded,
  highlightedItemIds,
  onClick,
}: {
  card: TodayScheduleSlotCard;
  studentsById: Map<string, Student>;
  todayItems: AssistantTodayItem[];
  markedItemIds: Set<string>;
  isExpanded: boolean;
  highlightedItemIds: Set<string>;
  onClick: () => void;
}) {
  const visualState = getSlotVisualState(card);
  const styles = slotStateStyles[visualState];
  const progress =
    card.totalCount > 0 ? (card.markedCount / card.totalCount) * 100 : 0;

  const studentNames = card.studentIds
    .map((id) => studentsById.get(id))
    .filter((student): student is Student => Boolean(student))
    .map((student) => formatStudentShortName(student.name));

  const slotItems = todayItems.filter((item) => card.itemIds.includes(item.id));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[220px] max-w-[260px] shrink-0 rounded-xl border p-3.5 text-left transition ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[#6B93FF]">{card.timeLabel}</p>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-zinc-300">
        {studentNames.length > 0 ? studentNames.join(', ') : '—'}
      </p>

      <p className="mt-2 text-[11px] text-zinc-500">
        {card.studentIds.length}{' '}
        {card.studentIds.length === 1 ? 'ученик' : 'учеников'}
      </p>

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${styles.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${styles.badge}`}>
          {getMarkingStatusLabel(card)}
        </p>
      </div>

      {card.isOutsideSchedule && (
        <p className="mt-2 text-[10px] font-medium text-violet-300">
          Вне расписания
        </p>
      )}

      <CollapsiblePanel open={isExpanded}>
        <ul className="mt-3 space-y-1.5 border-t border-zinc-800/80 pt-3">
          {slotItems.map((item) => {
            const student = studentsById.get(item.studentId);
            if (!student) return null;

            const isMarked = markedItemIds.has(item.id);
            const isHighlighted = highlightedItemIds.has(item.id);

            return (
              <li
                key={item.id}
                className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs ${
                  isHighlighted
                    ? 'bg-[#3166F0]/15 text-white'
                    : 'bg-zinc-900/60 text-zinc-300'
                }`}
              >
                <span>{formatStudentShortName(student.name)}</span>
                <span
                  className={
                    isMarked ? 'text-emerald-400' : 'text-zinc-500'
                  }
                >
                  {isMarked ? 'Отмечен' : 'Ждёт отметки'}
                </span>
              </li>
            );
          })}
        </ul>
      </CollapsiblePanel>
    </button>
  );
}
