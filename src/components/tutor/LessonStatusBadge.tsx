import type { LessonDisplayStatus } from '@/types/tutor';

const statusConfig: Record<
  LessonDisplayStatus,
  { label: string; className: string }
> = {
  completed: {
    label: 'Проведено',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  scheduled: {
    label: 'Запланировано',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  paid: {
    label: 'Оплачено',
    className: 'bg-[#3166F0]/15 text-[#6B93FF] border-[#3166F0]/30',
  },
  pending: {
    label: 'Ожидает подтверждения',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  unpaid: {
    label: 'Не оплачено',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
};

export function LessonStatusBadge({
  status,
}: {
  status: LessonDisplayStatus;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
