'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  formatMockExamDateLabel,
  getHighestScoreForExam,
} from '@/lib/mock-exams/calculations';
import type { MockExam } from '@/lib/mock-exams/types';
import { resolveEnterCellNavigation } from '@/lib/mock-exams/validation';
import { formatStudentShortName } from '@/lib/tutor-calculations';
import {
  sortStudentsByName,
  useMockExams,
} from '@/providers/MockExamsProvider';
import type { Student } from '@/types/tutor';

type MockExamsTableProps = {
  students: Student[];
  onEditExam: (exam: MockExam) => void;
  onDeleteExam: (exam: MockExam) => void;
};

export function MockExamsTable({
  students,
  onEditExam,
  onDeleteExam,
}: MockExamsTableProps) {
  const { exams, resultsByKey, getScore, saveScore, cellError } = useMockExams();
  const sortedStudents = sortStudentsByName(students);
  const inputRefs = useRef<Array<Array<HTMLInputElement | null>>>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [menuExamId, setMenuExamId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    inputRefs.current = sortedStudents.map(() =>
      exams.map(() => null),
    );
  }, [sortedStudents, exams]);

  const draftKey = (studentId: string, examId: string) =>
    `${studentId}:${examId}`;

  const getDisplayValue = (studentId: string, examId: string) => {
    const key = draftKey(studentId, examId);
    if (Object.prototype.hasOwnProperty.call(drafts, key)) {
      return drafts[key] ?? '';
    }
    const score = getScore(studentId, examId);
    return score === null ? '' : String(score);
  };

  const commitCell = useCallback(
    async (studentId: string, examId: string, raw: string) => {
      const key = draftKey(studentId, examId);
      setSavingKey(key);
      const ok = await saveScore(studentId, examId, raw);
      setSavingKey(null);
      if (ok) {
        setDrafts((current) => {
          if (!Object.prototype.hasOwnProperty.call(current, key)) {
            return current;
          }
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
      return ok;
    },
    [saveScore],
  );

  const focusCell = (rowIndex: number, colIndex: number) => {
    const node = inputRefs.current[rowIndex]?.[colIndex];
    if (!node) {
      return;
    }
    node.focus();
    node.select();
  };

  const handleKeyDown = async (
    event: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
    studentId: string,
    examId: string,
  ) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const raw = getDisplayValue(studentId, examId);
    await commitCell(studentId, examId, raw);

    const navigation = resolveEnterCellNavigation(
      rowIndex,
      sortedStudents.length,
    );
    if (!navigation.stay) {
      focusCell(navigation.nextRowIndex, colIndex);
    }
  };

  if (exams.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center text-zinc-500">
        Пробники пока не добавлены
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {cellError ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {cellError}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-950/90">
                <th className="sticky left-0 z-20 min-w-[150px] border-b border-b-zinc-700 border-r border-r-zinc-800 bg-zinc-950 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Ученик
                </th>
                {exams.map((exam) => {
                  const highest = getHighestScoreForExam(
                    exam.id,
                    [...resultsByKey.values()],
                  );
                  return (
                    <th
                      key={exam.id}
                      className="relative min-w-[120px] max-w-[160px] border-b border-b-zinc-700 border-r border-r-zinc-800 px-2 py-2.5 text-center text-xs font-medium leading-snug text-zinc-300 last:border-r-0"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="line-clamp-2 font-semibold text-white">
                          {exam.title}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {formatMockExamDateLabel(exam.examDate)} · {exam.maxScore}
                          {highest !== null ? ` · max ${highest}` : ''}
                        </span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setMenuExamId((current) =>
                                current === exam.id ? null : exam.id,
                              )
                            }
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700/80 text-zinc-500 transition hover:border-zinc-500 hover:text-white"
                            aria-label={`Меню пробника ${exam.title}`}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {menuExamId === exam.id ? (
                            <div className="absolute right-0 top-7 z-30 min-w-[150px] rounded-xl border border-zinc-700 bg-zinc-950 p-1 shadow-xl">
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuExamId(null);
                                  onEditExam(exam);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Редактировать
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuExamId(null);
                                  onDeleteExam(exam);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Удалить
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student, rowIndex) => (
                <tr
                  key={student.id}
                  className={
                    rowIndex % 2 === 0 ? 'bg-zinc-950/40' : 'bg-zinc-950/70'
                  }
                >
                  <td className="sticky left-0 z-10 border-b border-b-zinc-700 border-r border-r-zinc-800 bg-inherit px-3 py-1.5 text-xs font-medium text-white">
                    {formatStudentShortName(student.name)}
                  </td>
                  {exams.map((exam, colIndex) => {
                    const key = draftKey(student.id, exam.id);
                    const value = getDisplayValue(student.id, exam.id);
                    const isSaving = savingKey === key;

                    return (
                      <td
                        key={exam.id}
                        className="border-b border-b-zinc-700 border-r border-r-zinc-800 p-1 last:border-r-0"
                      >
                        <input
                          ref={(node) => {
                            if (!inputRefs.current[rowIndex]) {
                              inputRefs.current[rowIndex] = [];
                            }
                            inputRefs.current[rowIndex]![colIndex] = node;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={value}
                          disabled={isSaving}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            setDrafts((current) => ({
                              ...current,
                              [key]: nextValue,
                            }));
                          }}
                          onBlur={() => {
                            void commitCell(student.id, exam.id, value);
                          }}
                          onKeyDown={(event) => {
                            void handleKeyDown(
                              event,
                              rowIndex,
                              colIndex,
                              student.id,
                              exam.id,
                            );
                          }}
                          className="h-8 w-full min-w-[56px] rounded-md border border-zinc-700/80 bg-black/40 px-2 text-center text-xs font-semibold text-white outline-none transition focus:border-[#3166F0] focus:ring-1 focus:ring-[#3166F0]/40 disabled:opacity-60"
                          aria-label={`${formatStudentShortName(student.name)} · ${exam.title}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Enter сохраняет балл и переходит к следующему ученику в том же столбце.
        Пустая клетка — результат не выставлен; 0 — ноль баллов.
      </p>
    </div>
  );
}
