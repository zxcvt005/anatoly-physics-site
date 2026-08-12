'use client';

import { useId, useState } from 'react';
import { TopicAutocomplete } from '@/components/tutor/TopicAutocomplete';
import type { AssistantMarkingData } from '@/types/tutor';
import type { LessonTopic } from '@/types/tests';
import {
  handleStartTimeChange,
  isHmTimeRangeValid,
} from '@/lib/crm-time-utils';

type AttendanceChoice = 'present' | 'absent' | 'transferred';

interface AssistantMarkingFormProps {
  onSave: (data: AssistantMarkingData) => void;
  initialValues?: AssistantMarkingData;
  submitLabel?: string;
}

function getInitialAttendance(initialValues?: AssistantMarkingData): AttendanceChoice {
  if (initialValues?.isTransferred) return 'transferred';
  if (initialValues?.wasPresent === false) return 'absent';
  return 'present';
}

export function AssistantMarkingForm({
  onSave,
  initialValues,
  submitLabel = 'Сохранить',
}: AssistantMarkingFormProps) {
  const formId = useId();
  const [attendance, setAttendance] = useState<AttendanceChoice>(() =>
    getInitialAttendance(initialValues),
  );
  const [selectedTopic, setSelectedTopic] = useState<LessonTopic | null>(null);
  const [transferDate, setTransferDate] = useState(
    initialValues?.transfer?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [transferTime, setTransferTime] = useState(
    initialValues?.transfer?.time ?? '17:00',
  );
  const [transferEndTime, setTransferEndTime] = useState(
    initialValues?.transfer?.endTime ?? '18:00',
  );
  const [transferComment, setTransferComment] = useState(
    initialValues?.transfer?.comment ?? '',
  );

  const canSave =
    attendance !== 'transferred' ||
    Boolean(
      transferDate &&
        transferTime &&
        transferEndTime &&
        isHmTimeRangeValid(transferTime, transferEndTime),
    );

  const handleSave = () => {
    if (!canSave) return;

    if (attendance === 'transferred') {
      onSave({
        wasPresent: false,
        isTransferred: true,
        transfer: {
          date: transferDate,
          time: transferTime,
          endTime: transferEndTime,
          comment: transferComment.trim() || undefined,
        },
      });
      return;
    }

    if (attendance === 'absent') {
      onSave({ wasPresent: false });
      return;
    }

    onSave({
      wasPresent: true,
      topic: selectedTopic?.title,
      lessonTopicId: selectedTopic?.id,
    });
  };

  return (
    <div className="space-y-3">
      <RadioGroup
        name={`attendance-${formId}`}
        label="Посещение"
        value={attendance}
        onChange={(value) => setAttendance(value as AttendanceChoice)}
        options={[
          { value: 'present', label: 'Был' },
          { value: 'absent', label: 'Не был' },
          { value: 'transferred', label: 'Перенесено' },
        ]}
      />

      {attendance === 'present' && (
        <Field label="Тема занятия">
          <TopicAutocomplete
            value={initialValues?.lessonTopicId}
            onChange={setSelectedTopic}
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            После сохранения ученику будет назначено домашнее задание по этой теме.
          </p>
        </Field>
      )}

      {attendance === 'transferred' && (
        <>
          <Field label="Новая дата">
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Время начала">
              <input
                type="time"
                value={transferTime}
                onChange={(e) =>
                  handleStartTimeChange(
                    e.target.value,
                    setTransferTime,
                    setTransferEndTime,
                  )
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
              />
            </Field>
            <Field label="Время окончания">
              <input
                type="time"
                value={transferEndTime}
                onChange={(e) => setTransferEndTime(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
              />
            </Field>
          </div>

          <Field label="Комментарий">
            <input
              type="text"
              value={transferComment}
              onChange={(e) => setTransferComment(e.target.value)}
              placeholder="Необязательно"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#3166F0]"
            />
          </Field>
        </>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="w-full rounded-xl bg-[#3166F0] py-2.5 text-sm font-semibold text-white transition hover:bg-[#2858d4] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-6"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function RadioGroup({
  name,
  label,
  value,
  onChange,
  options,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-4">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
          >
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 border-zinc-600 bg-zinc-950 text-[#3166F0] focus:ring-[#3166F0]/40"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}
