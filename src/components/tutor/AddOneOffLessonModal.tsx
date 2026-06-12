'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { formatLessonTimeRange } from '@/lib/lesson-datetime';
import { formatDateShort } from '@/lib/tutor-calculations';
import type { Lesson, OneOffLessonInput, Student } from '@/types/tutor';

interface AddOneOffLessonModalProps {
  open: boolean;
  onClose: () => void;
  students: Student[];
  getMissedLessons: (studentId: string) => Lesson[];
  onSubmit: (input: OneOffLessonInput) => void;
}

type LessonKind = OneOffLessonInput['type'];

export function AddOneOffLessonButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-[#3166F0]/40 bg-[#3166F0]/10 px-3.5 py-2 text-sm font-medium text-[#6B93FF] transition hover:border-[#3166F0]/60 hover:bg-[#3166F0]/20 hover:text-white"
    >
      <Plus className="h-4 w-4" />
      Добавить разовое занятие
    </button>
  );
}

export function AddOneOffLessonModal({
  open,
  onClose,
  students,
  getMissedLessons,
  onSubmit,
}: AddOneOffLessonModalProps) {
  const [lessonKind, setLessonKind] = useState<LessonKind>('makeup');
  const [studentId, setStudentId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('17:00');
  const [endTime, setEndTime] = useState('18:00');
  const [topic, setTopic] = useState('');
  const [comment, setComment] = useState('');
  const [makeupForLessonId, setMakeupForLessonId] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      student.name.toLowerCase().includes(query),
    );
  }, [students, studentQuery]);

  const selectedStudent = students.find((s) => s.id === studentId);
  const missedLessons = studentId ? getMissedLessons(studentId) : [];

  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().slice(0, 10);
    setLessonKind('makeup');
    setStudentId('');
    setStudentQuery('');
    setDropdownOpen(false);
    setDate(today);
    setTime('17:00');
    setEndTime('18:00');
    setTopic('');
    setComment('');
    setMakeupForLessonId('');
  }, [open]);

  useEffect(() => {
    setMakeupForLessonId('');
  }, [studentId, lessonKind]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  if (!open) return null;

  const canSubmit =
    studentId &&
    date &&
    time &&
    endTime &&
    endTime > time &&
    (lessonKind === 'extra' || (lessonKind === 'makeup' && makeupForLessonId));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      type: lessonKind,
      studentId,
      date,
      time,
      endTime,
      topic: topic.trim() || undefined,
      comment: comment.trim() || undefined,
      makeupForLessonId:
        lessonKind === 'makeup' ? makeupForLessonId : undefined,
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
        aria-labelledby="one-off-lesson-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <h2 id="one-off-lesson-title" className="text-lg font-semibold text-white">
            Разовое занятие
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
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-300">
              Тип занятия
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <TypeOption
                selected={lessonKind === 'makeup'}
                onSelect={() => setLessonKind('makeup')}
                title="Отработка пропущенного"
                description="Замена пропущенного занятия"
              />
              <TypeOption
                selected={lessonKind === 'extra'}
                onSelect={() => setLessonKind('extra')}
                title="Дополнительное"
                description="Вне основного расписания"
              />
            </div>
          </fieldset>

          <div ref={dropdownRef} className="relative">
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Ученик
            </label>
            <input
              type="text"
              value={selectedStudent ? selectedStudent.name : studentQuery}
              onChange={(event) => {
                setStudentQuery(event.target.value);
                setStudentId('');
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Начните вводить имя…"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />

            {dropdownOpen && filteredStudents.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                {filteredStudents.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentId(student.id);
                        setStudentQuery(student.name);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-sm transition hover:bg-zinc-800 ${
                        student.id === studentId
                          ? 'text-[#6B93FF]'
                          : 'text-zinc-200'
                      }`}
                    >
                      {student.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lessonKind === 'makeup' && studentId && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Пропущенное занятие
              </label>
              {missedLessons.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-700 px-3.5 py-3 text-sm text-zinc-500">
                  У ученика нет неотработанных пропусков
                </p>
              ) : (
                <div className="space-y-2">
                  {missedLessons.map((lesson) => (
                    <label
                      key={lesson.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
                        makeupForLessonId === lesson.id
                          ? 'border-[#3166F0]/50 bg-[#3166F0]/10'
                          : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="missed-lesson"
                        value={lesson.id}
                        checked={makeupForLessonId === lesson.id}
                        onChange={() => setMakeupForLessonId(lesson.id)}
                        className="mt-0.5 accent-[#3166F0]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-white">
                          {formatDateShort(lesson.date)}
                          <span className="ml-2 font-normal text-[#6B93FF]">
                            {formatLessonTimeRange(lesson)}
                          </span>
                        </span>
                        {lesson.topic && (
                          <span className="mt-0.5 block text-xs text-zinc-400">
                            {lesson.topic}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="one-off-date"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Дата
            </label>
            <input
              id="one-off-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="one-off-time"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Время начала
              </label>
              <input
                id="one-off-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
              />
            </div>
            <div>
              <label
                htmlFor="one-off-end-time"
                className="mb-1.5 block text-sm font-medium text-zinc-300"
              >
                Время окончания
              </label>
              <input
                id="one-off-end-time"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
                min={time}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="one-off-topic"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Тема / комментарий
            </label>
            <input
              id="one-off-topic"
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Необязательно"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#3166F0] focus:outline-none focus:ring-1 focus:ring-[#3166F0]"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-[#3166F0] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2856d4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Добавить занятие
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

function TypeOption({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border px-3.5 py-3 text-left transition ${
        selected
          ? 'border-[#3166F0]/50 bg-[#3166F0]/10'
          : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-600'
      }`}
    >
      <span className="block text-sm font-medium text-white">{title}</span>
      <span className="mt-0.5 block text-xs text-zinc-400">{description}</span>
    </button>
  );
}
