'use client';

import { useState } from 'react';
import type { AttendanceStatus, HomeworkStatus } from '@/types/tutor';
import { formatTime } from '@/lib/tutor-calculations';

interface AssistantLessonCardProps {
  lessonId: string;
  studentName: string;
  time: string;
  initialTopic?: string;
  initialAttendance?: AttendanceStatus;
  initialHomeworkStatus?: HomeworkStatus;
  initialHomeworkScore?: number;
}

const attendanceOptions: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Был' },
  { value: 'late', label: 'Опоздал' },
  { value: 'absent', label: 'Не был' },
];

const homeworkOptions: { value: HomeworkStatus; label: string }[] = [
  { value: 'done', label: 'Сделано' },
  { value: 'partial', label: 'Частично' },
  { value: 'not_done', label: 'Не сделано' },
];

export function AssistantLessonCard({
  studentName,
  time,
  initialTopic = '',
  initialAttendance = 'present',
  initialHomeworkStatus = 'not_done',
  initialHomeworkScore = 0,
}: AssistantLessonCardProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [attendance, setAttendance] = useState<AttendanceStatus>(initialAttendance);
  const [homeworkStatus, setHomeworkStatus] =
    useState<HomeworkStatus>(initialHomeworkStatus);
  const [homeworkScore, setHomeworkScore] = useState(initialHomeworkScore);

  const handleSave = () => {
    alert(
      `Изменения для ${studentName} (${formatTime(time)}):\n\nТема: ${topic || '—'}\nПосещение: ${attendanceOptions.find((o) => o.value === attendance)?.label}\nДЗ: ${homeworkOptions.find((o) => o.value === homeworkStatus)?.label}\nБалл: ${homeworkScore}\n\n(Пока это демо — данные не сохраняются)`,
    );
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-white">{studentName}</p>
          <p className="text-sm text-zinc-400">{formatTime(time)}</p>
        </div>
        <span className="rounded-full border border-zinc-700 bg-black/40 px-3 py-1 text-xs text-zinc-400">
          Сегодня
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Тема урока
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Введите тему..."
            className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-sm text-white outline-none focus:border-[#3166F0]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Посещение
          </label>
          <div className="flex flex-wrap gap-2">
            {attendanceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAttendance(option.value)}
                className={`rounded-xl border px-3 py-1.5 text-sm transition ${
                  attendance === option.value
                    ? 'border-[#3166F0] bg-[#3166F0]/15 text-[#6B93FF]'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Статус ДЗ
            </label>
            <select
              value={homeworkStatus}
              onChange={(e) =>
                setHomeworkStatus(e.target.value as HomeworkStatus)
              }
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-sm text-white outline-none focus:border-[#3166F0]"
            >
              {homeworkOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Балл за ДЗ
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={homeworkScore}
              onChange={(e) => setHomeworkScore(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2.5 text-sm text-white outline-none focus:border-[#3166F0]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-black transition hover:scale-[1.01] sm:w-auto sm:px-6"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}
