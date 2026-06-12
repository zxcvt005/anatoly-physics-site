import { formatStudentShortName } from '@/lib/tutor-calculations';
import type { AssistantMarkedEntry, Student } from '@/types/tutor';

interface AssistantMarkedSummaryProps {
  entry: AssistantMarkedEntry;
  student: Student;
}

export function AssistantMarkedSummary({
  entry,
  student,
}: AssistantMarkedSummaryProps) {
  const { marking } = entry;
  const name = formatStudentShortName(student.name);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white">{name}</p>
        <span className="shrink-0 text-xs text-zinc-500">{entry.timeLabel}</span>
      </div>

      <ul className="mt-1.5 space-y-0.5 text-xs leading-relaxed">
        {marking.isTransferred ? (
          <SummaryLine ok label="Перенесено" accent="sky" />
        ) : marking.wasPresent ? (
          <>
            <SummaryLine ok label="Был" />
            {marking.homeworkDone ? (
              <SummaryLine
                ok
                label={`ДЗ ${marking.homeworkScore ?? '—'}/10`}
              />
            ) : (
              <SummaryLine ok={false} label="ДЗ не сделано" />
            )}
            {marking.topic && (
              <SummaryLine ok label={`Тема: ${marking.topic}`} />
            )}
          </>
        ) : (
          <SummaryLine ok={false} label="Не был" />
        )}
      </ul>
    </div>
  );
}

function SummaryLine({
  ok,
  label,
  accent,
}: {
  ok: boolean;
  label: string;
  accent?: 'sky';
}) {
  const colorClass = accent
    ? 'text-sky-300/90'
    : ok
      ? 'text-zinc-400'
      : 'text-red-400/90';

  return (
    <li className={colorClass}>
      <span className="mr-1">{ok ? '✓' : '✗'}</span>
      {label}
    </li>
  );
}
